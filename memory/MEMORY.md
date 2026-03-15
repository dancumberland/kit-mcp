# Memory

<!-- Auto-memory index. This file is loaded into every system prompt — keep it concise (<150 lines). -->
<!-- Create topic files (debugging.md, patterns.md) for detailed notes and link here. -->

## Kit V4 API

- Base URL: `https://api.kit.com/v4`
- Auth: `X-Kit-Api-Key` header (API key) or `Authorization: Bearer` (OAuth)
- Rate limits: 120/min (API key), 600/min (OAuth)
- Pagination: cursor-based (`after` parameter)

## Architecture Decisions

- **13 composite tools** — one per Kit resource area, discriminated union `action` parameter
- ADR-001: Composite over granular (Cursor 40-tool limit, 60-70% token reduction, temporal asymmetry)
- Full deliberation: `docs/PRD.md` Section 17

## Hard Rules

- No `any` types — biome enforces `noExplicitAny: "error"`
- No raw JSON output — always format via `formatters.ts`
- No axios/got/node-fetch — native `fetch` only
- Tool ceiling: 15 (currently 13)
- Retry only on 429 and 5xx, never 422
