import { Rule } from './types';

/**
 * Extract GraphQL params from GET URL search params.
 * Returns a parsed object with query/operationName/variables if found, otherwise undefined.
 */
export function extractGraphQLFromUrl(url: string): any | undefined {
  try {
    const urlObj = new URL(url, typeof location !== 'undefined' ? location.origin : undefined);
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

/**
 * Find the first matching rule for a given request.
 * Returns null if no rule matches or interception is disabled.
 *
 * For GET requests without a body, automatically extracts GraphQL params
 * from URL search params for matching.
 */
export function matchRule(
  rules: Rule[],
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>,
): Rule | null {
  // For requests without a body, try extracting GraphQL params from URL
  const effectiveBody = body || extractGraphQLFromUrl(url);

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Match HTTP method
    if (rule.match.method && rule.match.method !== method.toUpperCase()) continue;

    // Match URL pattern
    if (!matchUrl(url, rule.match.url)) continue;

    // Match headers
    if (rule.match.headers && Object.keys(rule.match.headers).length > 0) {
      if (!matchHeaders(headers || {}, rule.match.headers)) continue;
    }

    // GraphQL-specific matching
    if (rule.type === 'graphql' && rule.graphqlMatch) {
      if (!matchGraphQL(effectiveBody, rule.graphqlMatch)) continue;
    }

    return rule;
  }

  return null;
}

/**
 * Match a URL against a pattern with wildcard (*) support.
 * Patterns like "/api/v1/users/*" or "* /graphql*" are supported.
 */
export function matchUrl(url: string, pattern: string): boolean {
  // Escape regex special chars except *, then convert * to .*
  const regexStr = '^' + pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*') + '$';

  try {
    return new RegExp(regexStr, 'i').test(url);
  } catch {
    // Fallback: simple includes check if regex fails
    return url.toLowerCase().includes(pattern.toLowerCase().replace(/\*/g, ''));
  }
}

/**
 * Match request headers against rule headers.
 * Header names are case-insensitive, values are exact match.
 */
export function matchHeaders(
  requestHeaders: Record<string, string>,
  ruleHeaders: Record<string, string>,
): boolean {
  // Normalize request header names to lowercase for comparison
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(requestHeaders)) {
    normalized[key.toLowerCase()] = value;
  }

  for (const [key, value] of Object.entries(ruleHeaders)) {
    const reqValue = normalized[key.toLowerCase()];
    if (reqValue !== value) return false;
  }

  return true;
}

/**
 * Match a GraphQL request body against operation name and/or query fragment.
 * Supports batch queries (array of operations).
 */
export function matchGraphQL(
  body: any,
  match: { operationName?: string; query?: string; variables?: Record<string, any> },
): boolean {
  if (!body) return false;

  let parsed = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      return false;
    }
  }

  // Handle batch queries (array of operations)
  if (Array.isArray(parsed)) {
    return parsed.some((entry) => matchSingleGraphQL(entry, match));
  }

  return matchSingleGraphQL(parsed, match);
}

function matchSingleGraphQL(
  parsed: any,
  match: { operationName?: string; query?: string; variables?: Record<string, any> },
): boolean {
  if (match.operationName && parsed.operationName !== match.operationName) {
    return false;
  }

  if (match.query && parsed.query) {
    if (!normalizeGraphQLQuery(parsed.query).includes(normalizeGraphQLQuery(match.query))) {
      return false;
    }
  } else if (match.query && !parsed.query) {
    return false;
  }

  if (match.variables && Object.keys(match.variables).length > 0) {
    if (!matchVariables(parsed.variables, match.variables)) return false;
  }

  return true;
}

/**
 * Normalize a GraphQL query string for comparison.
 * Strips comments, collapses whitespace, and normalizes punctuation spacing.
 * This avoids false positives from formatting differences.
 */
export function normalizeGraphQLQuery(query: string): string {
  return query
    // Remove single-line comments (# ...)
    .replace(/#[^\n]*/g, '')
    // Remove multi-line string literals (triple-quote block strings)
    .replace(/"""[\s\S]*?"""/g, '""""""')
    // Collapse all whitespace (newlines, tabs, multiple spaces) to single space
    .replace(/\s+/g, ' ')
    // Remove spaces around structural punctuation: { } ( ) : , ! @ =
    .replace(/\s*([{}(),:!@=])\s*/g, '$1')
    // Trim
    .trim();
}

/**
 * Match request variables against rule variables.
 * Each key in ruleVars must exist in reqVars with a deep-equal value.
 */
function matchVariables(
  reqVars: any,
  ruleVars: Record<string, any>,
): boolean {
  if (!reqVars || typeof reqVars !== 'object') return false;

  for (const [key, value] of Object.entries(ruleVars)) {
    if (!(key in reqVars)) return false;
    if (!deepEqual(reqVars[key], value)) return false;
  }

  return true;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}
