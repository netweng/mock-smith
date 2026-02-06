# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Removed

- Deleted `mocksmith/` prototype directory (standalone demo app with hardcoded data, superseded by `src/`)
- Deleted `src/dashboard/pages/MockedRequests.tsx` (duplicate of RulesDashboard)
- Removed `RoutePath.MOCKED` enum value and `/mocked` route
- Removed Categories section (Mocked/Redirected/Injected) from Sidebar

### Added

- `docs/user-guide.md` — comprehensive Chinese user guide covering all UI pages

### Changed

- Updated all documentation (CLAUDE.md, README.md, CONTRIBUTING.md, design.md, improve.md) to reflect current implementation state

## [0.1.0] - 2026-02-06

### Added

- Chrome Extension (Manifest V3) with popup and options dashboard
- Rule engine with wildcard URL pattern matching
- REST interception: match by URL, method, headers
- GraphQL interception: match by operation name, query, variables
- GraphQL GET support: extract params from URL search params
- GraphQL query normalization for flexible matching
- Three action types: mock, rewrite, passthrough
- Rewrite action: shallow-merge rule body onto original JSON response
- Passthrough action: match and log without modifying the response
- Configurable response delay simulation
- Fetch and XMLHttpRequest override in MAIN world
- Bridge (ISOLATED world) for chrome.storage to page context communication
- Popup with global enable/disable toggle and active rules list
- Dashboard with rule CRUD, search, enable/disable, copy, delete
- Rule edit form with REST and GraphQL mode support
- Traffic Logs page with live intercepted request feed
- Traffic Logs: filter by action type (mocked, redirected, passthrough)
- Traffic Logs: request headers and response status display
- Traffic Logs: detail panel with Details, Headers, and Rule tabs
- In-memory ring buffer (max 500 entries) for traffic logs
- Service worker badge management (ON/OFF indicator)
- Default example rules installed on first install
- Dev mode with in-memory storage fallback when chrome APIs unavailable
- Tailwind CSS theming with custom color palette
