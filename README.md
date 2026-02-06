# MockSmith

> Forge API responses. No backend. No mercy.

**MockSmith** is a browser-first API mocking Chrome extension (Manifest V3) that intercepts, forges, and rewrites API responses directly in your browser — no proxy, no backend, no waiting.

Supports both **REST** and **GraphQL**.

---

## Features

- **Browser-first** — works entirely in the browser, no local proxy or external services required
- **Mock REST & GraphQL** — match REST by URL pattern, method, and headers; match GraphQL by operation name, query, and variables
- **Three action types** — mock, rewrite, or passthrough any matched request
- **Instant toggle** — enable or disable individual rules or the entire extension with one click
- **Traffic logs** — live view of all intercepted requests with details, headers, and status codes
- **Rule-based design** — define flexible rules with wildcard URL patterns and response templates
- **Delay simulation** — add configurable latency to mock responses for realistic testing

---

## Installation

**Prerequisites:** Node.js (v20+)

```bash
# 1. Clone the repository
git clone https://github.com/user/mock-smith.git
cd mock-smith

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build
```

**Load in Chrome:**

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

The MockSmith icon will appear in your toolbar.

---

## Rule Examples

### REST: Mock a User Profile

```json
{
  "name": "User Profile Mock",
  "type": "rest",
  "match": {
    "url": "*/api/user/profile*",
    "method": "GET"
  },
  "action": "mock",
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "body": {
      "id": "user_001",
      "name": "Jane Developer",
      "email": "jane@example.com",
      "role": "admin"
    },
    "delay": 200
  }
}
```

### GraphQL: Mock a Products Query

```json
{
  "name": "GraphQL Products Query",
  "type": "graphql",
  "match": {
    "url": "*/graphql*",
    "method": "POST"
  },
  "graphqlMatch": {
    "operationName": "GetProducts"
  },
  "action": "mock",
  "response": {
    "status": 200,
    "body": {
      "data": {
        "products": [
          { "id": "1", "name": "Mock Product A", "price": 29.99 },
          { "id": "2", "name": "Mock Product B", "price": 49.99 }
        ]
      }
    }
  }
}
```

---

## Action Types

| Action | Behavior |
|--------|----------|
| **mock** | Intercepts the request entirely and returns the configured response. The real server is never contacted. |
| **rewrite** | Lets the request reach the real server, then shallow-merges the rule's response body onto the original JSON response. If the original response is not valid JSON, the rule body is used directly. Headers and status can also be overridden. |
| **passthrough** | The request is matched and logged, but passed through to the real server unchanged. Useful for monitoring specific endpoints. |

---

## How It Works

```
chrome.storage.local ──► Bridge (ISOLATED) ──postMessage──► Interceptor (MAIN)
                                                              │
                                                         Override fetch / XHR
                                                              │
                                                         Match rule → fake response
                                                         No match   → pass through
```

- **Bridge** (ISOLATED world) reads rules from `chrome.storage` and forwards them to the page context via `postMessage`
- **Interceptor** (MAIN world) overrides `window.fetch` and `XMLHttpRequest` to intercept matching requests
- Rule changes are automatically pushed — no page refresh needed

---

## Development

MockSmith embraces vibe coding — fast experiments, minimal constraints, hack first, refine later.

```bash
# Dev server (UI preview only, chrome APIs use in-memory fallback)
npm run dev

# Build for extension loading
npm run build

# Run tests
npm run test
```

For more details, see [CONTRIBUTING.md](./CONTRIBUTING.md). Full architecture documentation is available in [`docs/design.md`](./docs/design.md) and a Chinese user guide in [`docs/user-guide.md`](./docs/user-guide.md).

---

## Known Limitations

- **Traffic logs are in-memory only** — logs are stored in the service worker's memory (ring buffer, max 500 entries) and are lost when the service worker restarts. Response bodies are not stored.
- **Rewrite merges JSON only** — the rewrite action performs a shallow merge (`{ ...original, ...rule }`) on JSON objects. Non-JSON responses fall back to using the rule body directly.
- **XHR rewrite is async** — XHR rewrite relies on a `load` event listener, so the rewritten response may not be visible to synchronous XHR consumers.
- **`fetch(Request)` body parsing** — `Blob` and `ReadableStream` body types in XHR `.send()` cannot be read synchronously and are skipped for rule matching.
- **GraphQL batch queries** — multiple GraphQL operations in a single request are not matched individually.
- **`match.headers`** — header matching is defined in the type system but not yet implemented in the rule engine.

---

## Inspiration

- Chrome DevTools
- Requestly
- MSW (Mock Service Worker)
- Charles / Proxyman
- The belief that frontend should never wait for backend

---

## Contributing

Contributions are welcome in any form — features, bug fixes, rule engine ideas, UI/UX improvements, documentation.

Just open an issue or a PR — no gatekeeping.
