/**
 * Interceptor script (MAIN world).
 * Overrides window.fetch and XMLHttpRequest to intercept requests
 * and return mock responses based on rules received from the bridge.
 */

import { matchRule } from '../shared/rule-engine';
import type { Rule } from '../shared/types';

(function () {
  if ((window as any).__MOCKSMITH_INSTALLED__) return;
  (window as any).__MOCKSMITH_INSTALLED__ = true;

  let rules: Rule[] = [];
  let enabled = false;

  function findMatch(
    url: string,
    method: string,
    body?: any,
    headers?: Record<string, string>,
  ): Rule | null {
    if (!enabled) return null;
    return matchRule(rules, url, method, body, headers);
  }

  function notifyInterception(
    url: string,
    method: string,
    rule: Rule,
    requestHeaders?: Record<string, string>,
    responseStatus?: number,
  ) {
    window.postMessage(
      {
        source: 'mocksmith-interceptor',
        type: 'REQUEST_INTERCEPTED',
        data: {
          url,
          method,
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          timestamp: Date.now(),
          requestHeaders,
          responseStatus,
        },
      },
      '*',
    );
  }

  // --- Listen for rules from bridge ---

  window.addEventListener('message', (event) => {
    if (
      event.data?.source === 'mocksmith-bridge' &&
      event.data?.type === 'MOCKSMITH_RULES'
    ) {
      rules = event.data.rules || [];
      enabled = event.data.enabled;
    }
  });

  // --- Helper: read body as text from various BodyInit types ---

  async function readBodyAsText(body: any): Promise<string | undefined> {
    if (!body) return undefined;
    if (typeof body === 'string') return body;
    try {
      if (body instanceof Blob) return await body.text();
      if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
      if (body instanceof URLSearchParams) return body.toString();
      if (body instanceof FormData) {
        // FormData is not JSON-parseable, skip for GraphQL matching
        return undefined;
      }
      if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        return new TextDecoder().decode(combined);
      }
    } catch {
      // Ignore read errors
    }
    return undefined;
  }

  // --- Helper: extract GraphQL params from GET URL search params ---

  function extractGraphQLFromUrl(url: string): any | undefined {
    try {
      const urlObj = new URL(url, location.origin);
      const query = urlObj.searchParams.get('query');
      const operationName = urlObj.searchParams.get('operationName');
      const variablesStr = urlObj.searchParams.get('variables');

      if (!query && !operationName) return undefined;

      const result: any = {};
      if (query) result.query = query;
      if (operationName) result.operationName = operationName;
      if (variablesStr) {
        try {
          result.variables = JSON.parse(variablesStr);
        } catch {
          // Ignore invalid variables JSON
        }
      }
      return result;
    } catch {
      return undefined;
    }
  }

  // --- Helper: extract headers as plain object ---

  function extractHeaders(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    // Prefer init.headers, fall back to Request.headers
    const source = init?.headers || (input instanceof Request ? input.headers : undefined);
    if (!source) return result;
    if (source instanceof Headers) {
      source.forEach((value, key) => { result[key] = value; });
    } else if (Array.isArray(source)) {
      for (const [key, value] of source) {
        result[key] = value;
      }
    } else {
      Object.assign(result, source);
    }
    return result;
  }

  // --- Helper: build mock Response ---

  function buildMockResponse(matched: Rule): Response {
    const responseBody =
      typeof matched.response.body === 'string'
        ? matched.response.body
        : JSON.stringify(matched.response.body);

    return new Response(responseBody, {
      status: matched.response.status || 200,
      statusText: 'OK',
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-MockSmith': 'true',
        ...(matched.response.headers || {}),
      }),
    });
  }

  // --- Helper: build rewritten Response ---

  async function buildRewriteResponse(
    originalResponse: Response,
    matched: Rule,
  ): Promise<Response> {
    let finalBody: string;
    try {
      const originalBody = await originalResponse.json();
      const ruleBody =
        typeof matched.response.body === 'string'
          ? JSON.parse(matched.response.body)
          : matched.response.body;

      // Shallow merge: rule body overrides original body
      if (typeof originalBody === 'object' && originalBody !== null &&
          typeof ruleBody === 'object' && ruleBody !== null &&
          !Array.isArray(originalBody) && !Array.isArray(ruleBody)) {
        finalBody = JSON.stringify({ ...originalBody, ...ruleBody });
      } else {
        finalBody = typeof ruleBody === 'string' ? ruleBody : JSON.stringify(ruleBody);
      }
    } catch {
      // If parsing fails, use rule body directly
      finalBody =
        typeof matched.response.body === 'string'
          ? matched.response.body
          : JSON.stringify(matched.response.body);
    }

    // Merge headers: original + rule overrides
    const headers = new Headers(originalResponse.headers);
    headers.set('X-MockSmith', 'rewrite');
    if (matched.response.headers) {
      for (const [key, value] of Object.entries(matched.response.headers)) {
        headers.set(key, value);
      }
    }

    return new Response(finalBody, {
      status: matched.response.status || originalResponse.status,
      statusText: originalResponse.statusText,
      headers,
    });
  }

  // --- Override fetch ---

  const originalFetch = window.fetch;

  (window as any).fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Read method: init takes priority, then Request object, then default GET
    const method = init?.method || (input instanceof Request ? input.method : 'GET');

    // Read body as text for rule matching.
    // Handles string, Blob, ArrayBuffer, URLSearchParams, ReadableStream.
    let body: any = undefined;
    if (init?.body) {
      body = await readBodyAsText(init.body);
    } else if (input instanceof Request) {
      try {
        body = await input.clone().text();
      } catch {
        // Ignore body read errors
      }
    }

    // For GET requests, extract GraphQL params from URL search params
    const gqlBody = !body ? extractGraphQLFromUrl(url) : body;

    const headers = extractHeaders(input, init);
    const matched = findMatch(url, method, gqlBody, headers);

    if (matched) {
      if (matched.response.delay) {
        await new Promise((r) => setTimeout(r, matched.response.delay));
      }

      switch (matched.action) {
        case 'passthrough':
          notifyInterception(url, method, matched, headers, undefined);
          return originalFetch.call(this, input, init);

        case 'rewrite': {
          const original = await originalFetch.call(this, input, init);
          const rewritten = await buildRewriteResponse(original, matched);
          notifyInterception(url, method, matched, headers, rewritten.status);
          return rewritten;
        }

        case 'mock':
        default: {
          const mockStatus = matched.response.status || 200;
          notifyInterception(url, method, matched, headers, mockStatus);
          return buildMockResponse(matched);
        }
      }
    }

    return originalFetch.call(this, input, init);
  };

  // --- Override XMLHttpRequest ---

  const OrigXHR = window.XMLHttpRequest;
  const origOpen = OrigXHR.prototype.open;
  const origSend = OrigXHR.prototype.send;
  const origSetRequestHeader = OrigXHR.prototype.setRequestHeader;

  OrigXHR.prototype.open = function (
    method: string,
    url: string | URL,
    ...args: any[]
  ) {
    (this as any).__ms_method = method;
    (this as any).__ms_url = typeof url === 'string' ? url : url.toString();
    (this as any).__ms_headers = {};
    return origOpen.apply(this, [method, url, ...args] as any);
  };

  OrigXHR.prototype.setRequestHeader = function (name: string, value: string) {
    if ((this as any).__ms_headers) {
      (this as any).__ms_headers[name] = value;
    }
    return origSetRequestHeader.call(this, name, value);
  };

  function fakeXhrResponse(
    xhr: XMLHttpRequest,
    status: number,
    body: string,
    url: string,
    delay: number,
  ) {
    setTimeout(() => {
      Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
      Object.defineProperty(xhr, 'status', { writable: true, value: status });
      Object.defineProperty(xhr, 'statusText', { writable: true, value: 'OK' });
      Object.defineProperty(xhr, 'responseText', { writable: true, value: body });
      Object.defineProperty(xhr, 'response', { writable: true, value: body });
      Object.defineProperty(xhr, 'responseURL', { writable: true, value: url });
      xhr.dispatchEvent(new Event('readystatechange'));
      xhr.dispatchEvent(new Event('load'));
      xhr.dispatchEvent(new Event('loadend'));
    }, delay);
  }

  OrigXHR.prototype.send = function (sendBody?: any) {
    const url: string = (this as any).__ms_url;
    const method: string = (this as any).__ms_method;
    const headers: Record<string, string> = (this as any).__ms_headers || {};

    // Convert non-string body types to text synchronously where possible.
    // XHR send() is synchronous, so we can only handle sync-readable types here.
    let body: any = sendBody;
    if (sendBody && typeof sendBody !== 'string') {
      if (sendBody instanceof ArrayBuffer) {
        body = new TextDecoder().decode(sendBody);
      } else if (sendBody instanceof URLSearchParams) {
        body = sendBody.toString();
      }
      // Blob/ReadableStream require async read — not feasible in sync XHR.send()
      // These are rare for GraphQL payloads.
    }

    // For GET requests, extract GraphQL params from URL search params
    const gqlBody = !body ? extractGraphQLFromUrl(url) : body;

    const matched = findMatch(url, method, gqlBody, headers);

    if (matched) {
      const responseBody =
        typeof matched.response.body === 'string'
          ? matched.response.body
          : JSON.stringify(matched.response.body);

      const delay = matched.response.delay || 0;

      switch (matched.action) {
        case 'passthrough':
          notifyInterception(url, method, matched, headers, undefined);
          return origSend.call(this, sendBody);

        case 'rewrite': {
          const xhr = this;

          xhr.addEventListener('load', function rewriteHandler() {
            xhr.removeEventListener('load', rewriteHandler);
            const rewriteStatus = matched.response.status || xhr.status;
            try {
              const originalBody = JSON.parse(xhr.responseText);
              const ruleBody =
                typeof matched.response.body === 'string'
                  ? JSON.parse(matched.response.body)
                  : matched.response.body;

              let finalBody: string;
              if (typeof originalBody === 'object' && originalBody !== null &&
                  typeof ruleBody === 'object' && ruleBody !== null &&
                  !Array.isArray(originalBody) && !Array.isArray(ruleBody)) {
                finalBody = JSON.stringify({ ...originalBody, ...ruleBody });
              } else {
                finalBody = typeof ruleBody === 'string' ? ruleBody : JSON.stringify(ruleBody);
              }

              Object.defineProperty(xhr, 'responseText', { writable: true, value: finalBody });
              Object.defineProperty(xhr, 'response', { writable: true, value: finalBody });
              if (matched.response.status) {
                Object.defineProperty(xhr, 'status', { writable: true, value: matched.response.status });
              }
            } catch {
              // If parsing fails, override with rule body directly
              Object.defineProperty(xhr, 'responseText', { writable: true, value: responseBody });
              Object.defineProperty(xhr, 'response', { writable: true, value: responseBody });
            }
            notifyInterception(url, method, matched, headers, rewriteStatus);
          });
          return origSend.call(this, sendBody);
        }

        case 'mock':
        default: {
          const mockStatus = matched.response.status || 200;
          notifyInterception(url, method, matched, headers, mockStatus);
          fakeXhrResponse(this, mockStatus, responseBody, url, delay);
          return;
        }
      }
    }

    return origSend.call(this, sendBody);
  };
})();
