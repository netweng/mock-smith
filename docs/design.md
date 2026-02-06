# MockSmith Design Document

## Architecture Overview

MockSmith is a Chrome Extension (Manifest V3) that intercepts fetch/XHR requests in the browser and returns mock, rewritten, or passthrough responses based on user-defined rules. No proxy or backend is required.

### Execution Contexts

Chrome MV3 enforces strict context isolation. MockSmith operates across three contexts:

| Context | File | World | Can Access |
|---------|------|-------|------------|
| Service Worker | `service-worker.ts` | Background | `chrome.*` APIs, no DOM |
| Bridge | `bridge.ts` | ISOLATED | `chrome.*` APIs, `window.postMessage` |
| Interceptor | `interceptor.ts` | MAIN | Page `window`, `fetch`, `XMLHttpRequest` |

## Request Interception Chain

```
chrome.storage.local
  │
  ├─ onChanged ──► Bridge (ISOLATED world)
  │                    │
  │                    ▼ postMessage (source: 'mocksmith-bridge')
  │
  │                Interceptor (MAIN world)
  │                    │
  │              ┌─────┴──────┐
  │              │  matchRule  │  ← shared/rule-engine.ts
  │              └─────┬──────┘
  │                    │
  │         ┌──────────┼──────────┐
  │         ▼          ▼          ▼
  │       mock      rewrite   passthrough
  │         │          │          │
  │    fake Response   │     originalFetch()
  │                    │
  │           originalFetch()
  │              + merge body
  │              + override headers
  │                    │
  └─── notifyInterception ──► Bridge ──► Service Worker (ring buffer)
```

## Rule Model

```typescript
interface Rule {
  id: string;
  enabled: boolean;
  name: string;
  description?: string;
  type: 'rest' | 'graphql';
  match: {
    url: string;              // Wildcard pattern (* = .*)
    method?: HttpMethod;      // GET | POST | PUT | DELETE | PATCH
    headers?: Record<string, string>;  // Case-insensitive name, exact value
  };
  graphqlMatch?: {
    operationName?: string;
    query?: string;           // Substring match against query field
    variables?: Record<string, any>;  // Subset match (deep equality)
  };
  action: 'mock' | 'rewrite' | 'passthrough';
  response: {
    status: number;
    headers?: Record<string, string>;
    body: any;
    delay?: number;           // Milliseconds
  };
  label?: string;
  createdAt: number;
  updatedAt: number;
}
```

## Matching Algorithm

Implemented in `src/shared/rule-engine.ts` — the single source of truth for all matching logic.

### Evaluation Order (per rule)

1. **Enabled check** — skip disabled rules
2. **HTTP method** — exact match (case-insensitive)
3. **URL pattern** — wildcard-to-regex conversion
4. **Headers** — all rule headers must be present in request (name case-insensitive, value exact)
5. **GraphQL** — operationName exact match, query substring match, variables subset match (deep equality)

### GET GraphQL Auto-Extraction

When no request body is provided (e.g. GET requests), `matchRule` automatically extracts GraphQL params (`query`, `operationName`, `variables`) from URL search params via `extractGraphQLFromUrl()`. This logic lives entirely in `rule-engine.ts`.

### First Match Wins

Rules are evaluated in array order (storage array index = priority). The first matching rule is returned regardless of action type. Users can drag-and-drop rules in the Dashboard to change priority.

### URL Matching

Patterns use `*` as wildcard (converted to `.*` in regex). The entire URL must match (anchored with `^...$`). Matching is case-insensitive.

Examples:
- `*/api/users/*` matches `https://example.com/api/users/123`
- `*/graphql` matches `https://api.example.com/graphql`

### GraphQL Batch Query Support

When the parsed body is an array, each entry is checked independently. If any entry matches the rule's `operationName` or `query`, the rule matches.

## Action Behavior

### Mock

Returns a fully synthetic response. The real server is never contacted.

- **fetch**: Returns a new `Response(body, { status, headers })`
- **XHR**: Overrides `readyState`, `status`, `responseText`, `response` via `Object.defineProperty`, then dispatches `readystatechange`, `load`, `loadend` events

### Rewrite

Sends the real request, then modifies the response before returning it to the caller.

- **fetch**: Calls `originalFetch()`, parses the JSON response, shallow-merges rule body (`{ ...original, ...ruleBody }`), applies rule headers and status
- **XHR**: Attaches a `load` event listener that overwrites `responseText` and `response` after the real response arrives

### Passthrough

Matches the rule (and logs the interception) but lets the request proceed unmodified. Useful for whitelisting or traffic observation. Error/abort events are also logged for both fetch and XHR to ensure complete observability.

## Traffic Logs Design

### Storage

Logs are kept in a ring buffer (max 500 entries) in the service worker's memory. They are **not** persisted to `chrome.storage` — MV3 service worker hibernation will clear them.

### Data Flow

1. Interceptor sends `REQUEST_INTERCEPTED` via `postMessage` to Bridge
2. Bridge forwards via `chrome.runtime.sendMessage` to Service Worker
3. Service Worker appends to ring buffer

### Log Entry

```typescript
interface TrafficLogEntry {
  id: string;
  url: string;
  method: string;
  ruleId: string;
  ruleName: string;
  action: 'mock' | 'rewrite' | 'passthrough';
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseStatus?: number;
  tabId?: number;
  requestType?: 'rest' | 'graphql';
  operationName?: string | string[];
  responseBody?: string;        // Truncated to 10KB; binary content skipped
}
```

### Retrieval

Dashboard polls the service worker every 2 seconds via `GET_LOGS` message. `CLEAR_LOGS` resets the buffer.

## postMessage Protocol

### Bridge → Interceptor

```json
{
  "source": "mocksmith-bridge",
  "type": "MOCKSMITH_RULES",
  "rules": [...],
  "enabled": true
}
```

### Interceptor → Bridge

```json
{
  "source": "mocksmith-interceptor",
  "type": "REQUEST_INTERCEPTED",
  "data": {
    "url": "https://...",
    "method": "GET",
    "ruleId": "...",
    "ruleName": "...",
    "action": "mock",
    "timestamp": 1234567890
  }
}
```

### Bridge → Service Worker

Forwarded as `chrome.runtime.sendMessage`:

```json
{
  "type": "REQUEST_INTERCEPTED",
  "data": { ... }
}
```
