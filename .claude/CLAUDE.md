# Project Instructions

## Project: Kit MCP Server

Agent-optimized MCP server for Kit.com (ConvertKit) V4 API. 13 composite tools, discriminated union architecture, formatted text responses.

---

## Architecture Summary

- **13 composite tools** — one per Kit resource area, not 1:1 API wrappers
- **Discriminated union pattern** — each tool accepts an `action` parameter (z.enum), remaining params validated per-action via Zod
- **Formatted text output** — every tool returns agent-friendly text summaries, never raw JSON
- **Rate limiting** — sliding window (120/min API key, 600/min OAuth) with exponential backoff
- **Auth** — API key (default) + OAuth (for bulk ops and purchases)

Full PRD: `docs/PRD.md`
ADR record: `docs/PRD.md` Section 17

---

## Tech Stack

```
Language:        TypeScript 5.6+
Runtime:         Node.js 22+ (LTS)
MCP SDK:         @modelcontextprotocol/sdk ^1.25
Validation:      Zod ^3.23
Transport:       stdio only
Build:           tsup (ESM + CJS, shebang)
Testing:         Vitest
Linting:         Biome
CI:              GitHub Actions
```

**No axios/got/node-fetch.** Native `fetch` only. **No `any` types anywhere.**

---

## Project Structure

```
Kit_MCP/
├── src/
│   ├── index.ts              # Entry point (shebang, server bootstrap)
│   ├── server.ts             # MCP server setup, tool registration
│   ├── client.ts             # Kit API HTTP client (auth, rate limiting, retries)
│   ├── types.ts              # Shared TypeScript types
│   ├── formatters.ts         # Response formatters (raw JSON → agent-friendly text)
│   ├── errors.ts             # Typed error classes with recovery hints
│   └── tools/
│       ├── subscribers.ts    # manage_subscribers (7 actions, 9 endpoints)
│       ├── tags.ts           # manage_tags (6 actions, 8 endpoints)
│       ├── broadcasts.ts     # manage_broadcasts (6 actions, 8 endpoints)
│       ├── forms.ts          # manage_forms (3 actions, 4 endpoints)
│       ├── sequences.ts      # manage_sequences (3 actions, 3 endpoints)
│       ├── custom-fields.ts  # manage_custom_fields (4 actions, 4 endpoints)
│       ├── purchases.ts      # manage_purchases (3 actions, 3 endpoints)
│       ├── segments.ts       # manage_segments (1 action, 1 endpoint)
│       ├── webhooks.ts       # manage_webhooks (3 actions, 3 endpoints)
│       ├── email-templates.ts # manage_email_templates (1 action, 1 endpoint)
│       ├── account.ts        # get_account (5 endpoints)
│       ├── bulk.ts           # bulk_operations (7 actions, OAuth only)
│       └── connection.ts     # test_connection (1 endpoint)
├── tests/
│   ├── unit/                 # Formatters, client, tools, action dispatch
│   └── integration/          # Requires KIT_API_KEY env var
├── docs/
│   └── PRD.md                # Full product requirements document
├── .claude/                  # Claude Code configuration
│   ├── CLAUDE.md             # This file
│   ├── INDEX.md              # Session index
│   ├── commands/             # Slash commands
│   ├── rules/                # Path-scoped rules (auto-activate by file)
│   └── sessions/             # Session logs
├── memory/                   # Claude auto-memory (persistent across sessions)
│   └── MEMORY.md             # Memory index (loaded into system prompt)
├── ACTIVE_WORK.md            # Current task tracking
├── PROJECT_STATUS.md         # High-level project status
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── biome.json
├── server.json               # MCP Registry metadata
├── LICENSE
└── README.md
```

---

## Hard Rules

1. **Tool count ceiling: 15** — currently 13, never exceed 15 (Cursor compatibility)
2. **No raw JSON output** — always format to text via formatters.ts
3. **No `any` types** — TypeScript strict mode, zero `any`
4. **Discriminated unions** — every composite tool uses `z.discriminatedUnion("action", [...])`
5. **No retry on 422** — only retry on 429 and 5xx
6. **API keys from env only** — never from tool inputs, never in logs/errors
7. **Stateless** — no persistent storage, no caching
8. **stdio only** — no HTTP/SSE transport in V1

---

## Development Workflow

```bash
# Dev
npm run dev          # tsup --watch

# Build
npm run build        # tsup

# Test
npm test             # vitest run
npm run test:watch   # vitest
npm run test:int     # KIT_API_KEY=xxx vitest run tests/integration

# Lint
npm run lint         # biome check
npm run lint:fix     # biome check --fix

# Type check
npm run typecheck    # tsc --noEmit

# Publish
npm publish --access public   # requires token in ~/.npmrc
```

### npm Publish Setup

Dan uses WebAuthn (Dashlane biometrics) for npm 2FA — `npm publish` can't prompt for it. The workaround is a **granular access token** with "Bypass 2FA" checked, stored in `~/.npmrc`.

**Current token:** `kit-mcp-ci` (expires Jun 15, 2026, 90-day, read/write all packages)

**When the token expires**, create a new one:
1. Go to https://www.npmjs.com/settings/dancumberland/tokens/granular-access-tokens/new
2. Name: `kit-mcp-ci` (or similar)
3. Check **Bypass two-factor authentication (2FA)**
4. Packages permissions: **Read and write**
5. Select packages: **All packages**
6. Expiration: **90 days** (maximum)
7. Click **Generate token** — Dashlane will prompt for biometrics
8. Copy the token and run: `npm config set //registry.npmjs.org/:_authToken <token>`

The token lives in `~/.npmrc` (global, not project). `.npmrc` is in `.gitignore`.

---

## Kit V4 API Reference

- Base URL: `https://api.kit.com/v4`
- Auth header (API key): `X-Kit-Api-Key: <key>`
- Auth header (OAuth): `Authorization: Bearer <token>`
- Rate limits: 120/min (API key), 600/min (OAuth)
- Pagination: cursor-based (`after` parameter)
- API docs: https://developers.kit.com/v4

---

## Commit Convention

Use conventional commits:
- `feat:` new tool or action
- `fix:` bug fix
- `refactor:` code restructure
- `test:` test additions/changes
- `docs:` documentation
- `chore:` build, CI, dependencies

---

## Key Resources

- **PRD**: `docs/PRD.md` — full product requirements, tool inventory, data contracts, acceptance criteria
- **Kit V4 API docs**: https://developers.kit.com/v4
- **MCP SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Competitor (reference)**: https://www.npmjs.com/package/kit-mcp-server
- **Systems Registry**: `~/Documents/Work/CoreContext/SYSTEMS.md` — index of all infrastructure/services

---

*Shared sections (Session Management, Foundational Rules, Voice, Research Protocol, etc.) live in the global `~/.claude/CLAUDE.md` and apply automatically to all projects.*
