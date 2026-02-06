# Contributing to MockSmith

## Prerequisites

- Node.js >= 20
- Chrome / Chromium-based browser

## Setup

```bash
npm install
```

## Build

```bash
npm run build
```

This produces a `dist/` folder containing the extension.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the `dist/` directory

## Development

```bash
npm run dev
```

Starts a Vite dev server on port 3000 for iterating on the dashboard and popup UI. Note: Chrome extension APIs (`chrome.storage`, etc.) are not available in dev mode — an in-memory fallback is used instead.

To test the full extension (interception, badge, storage), always use `npm run build` and reload the unpacked extension.

## Testing

```bash
npm run test
```

Runs Vitest unit tests (rule engine matching, URL patterns, GraphQL matching, etc.).

## Project Structure

```
src/
  shared/        # Types, rule engine, storage abstraction, tests
  background/    # Service worker (badge, messaging, install defaults, log ring buffer)
  content/       # Content scripts (bridge + interceptor)
  popup/         # Extension popup UI (React)
  dashboard/     # Full dashboard / options page (React)
    pages/       # RulesDashboard, EditRule, TrafficLogs
    components/  # Sidebar, MethodBadge
    hooks/       # useStorage (rules/enabled), useLogs (traffic polling)
public/
  manifest.json  # Chrome MV3 manifest
docs/
  design.md      # Architecture design document
  user-guide.md  # User guide (Chinese)
```

## Architecture

| Layer | World | Role |
|-------|-------|------|
| **Service Worker** | Background | Badge, storage init, message routing, traffic log ring buffer |
| **Bridge** | ISOLATED | Reads `chrome.storage`, posts rules to page via `postMessage` |
| **Interceptor** | MAIN | Overrides `fetch`/`XHR`, matches rules, returns mock responses |
| **Popup** | Extension | Quick toggle + rule list |
| **Dashboard** | Extension | Full rule CRUD, traffic logs, search & filter |
