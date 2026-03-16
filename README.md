# @dancumberland/kit-mcp

The most complete MCP server for [Kit.com](https://kit.com) (formerly ConvertKit). 13 agent-optimized tools covering 100% of the Kit V4 API — including engagement analytics, bulk operations, and broadcast click tracking that no other Kit MCP offers.

## How This Is Different

Other Kit MCP servers wrap each API endpoint as a separate tool (29+ tools). That approach breaks in practice:

| | **@dancumberland/kit-mcp** | **Other Kit MCPs** |
|---|---|---|
| **Tool count** | 13 composite tools (44 actions) | 29+ individual tools |
| **Engagement analytics** | Per-subscriber open/click rates, batch comparison across 100 subscribers, engagement-based filtering | None |
| **Broadcast analytics** | Per-broadcast stats, cross-broadcast comparison, per-link click tracking | Basic list/get only |
| **Bulk operations** | Batch create subscribers, tags, form subscriptions (up to 10k per call) | None |
| **Response format** | Formatted text summaries (agent-friendly) | Raw JSON (agent must parse) |
| **Rate limiting** | Sliding window with automatic retry + exponential backoff | None |
| **Error recovery** | Typed errors with actionable recovery hints | Generic errors |
| **Cursor compatible** | 13 tools (well under 40-tool limit) | 29+ tools (risks hitting limit) |
| **Token overhead** | ~3,200 tokens for all tool definitions | ~8,000+ tokens |

### Engagement Analytics (Exclusive)

This is the only Kit MCP that can answer "who are my most engaged subscribers?":

```
> Find my most engaged 100 subscribers who've been on my list over 6 months

Subscriber Comparison (100 of 100 loaded, sorted by open rate):

  1. Alice <alice@example.com> — Open: 82.3% | Click: 24.1% | Sent: 95 | Last open: 2026-03-15 (ID: 456)
  2. Bob <bob@example.com> — Open: 71.0% | Click: 18.5% | Sent: 102 | Last open: 2026-03-14 (ID: 789)
  ...
```

Other Kit MCPs can list subscribers and get basic profiles, but can't fetch engagement stats, compare across subscribers, or filter by engagement metrics.

## What This Does

Connects any MCP client (Claude Desktop, Claude Code, Cursor, Windsurf, etc.) to your Kit.com email marketing account. Ask questions naturally:

- "How many subscribers do I have and how's my list growing?"
- "Show me my broadcast stats from last week"
- "Find my most engaged subscribers from the past 6 months"
- "Tag everyone who signed up through my landing page"
- "Create a draft broadcast for my newsletter"
- "Which links got the most clicks in my last broadcast?"

No coding required — just set it up and start talking.

## Prerequisites

1. **Node.js 22+** — Download from [nodejs.org](https://nodejs.org). Check with `node --version`.
2. **A Kit.com account** — Free or paid, any plan.
3. **Your Kit API key** — [kit.com → Account Settings → Developer](https://app.kit.com/account/developer). Starts with `kit_`.

## Setup: Claude Desktop App (Recommended)

### Step 1: Find your config file

**Mac:**
```bash
open ~/Library/Application\ Support/Claude/
```
Open `claude_desktop_config.json` in any text editor.

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Add the Kit MCP server

If the file is empty or doesn't exist, paste this (replace `your-kit-api-key` with your actual key):

```json
{
  "mcpServers": {
    "kit": {
      "command": "npx",
      "args": ["-y", "@dancumberland/kit-mcp@latest"],
      "env": {
        "KIT_API_KEY": "your-kit-api-key"
      }
    }
  }
}
```

If you already have other MCP servers, add `"kit"` inside the existing `"mcpServers"` block with a comma after the previous entry.

### Step 3: Restart Claude Desktop

Fully quit (not just close the window) and reopen.

### Step 4: Verify it works

> Test my Kit connection

Claude should respond with your account name, auth method, and rate limit.

## Setup: Claude Desktop with Cowork

[Cowork](https://www.anthropic.com/research/cowork) is Claude Desktop's background agent. After completing the setup above, Cowork automatically has access to your Kit tools.

**Example tasks:**

- "Every morning at 8am, summarize my subscriber growth and email performance from the last 24 hours."
- "Every Monday at 9am, compare my broadcast stats from the past week — open rates, click rates, and unsubscribes."
- "Every Friday, list all tags with fewer than 10 subscribers (candidates for cleanup)."

## Setup: Claude Code (CLI)

Add to `.claude/settings.local.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "kit": {
      "command": "npx",
      "args": ["-y", "@dancumberland/kit-mcp@latest"],
      "env": {
        "KIT_API_KEY": "your-kit-api-key"
      }
    }
  }
}
```

## Setup: Cursor

1. Open Settings (Cmd+,)
2. Search for "MCP"
3. Click "Add MCP Server"
4. Add:

```json
{
  "kit": {
    "command": "npx",
    "args": ["-y", "@dancumberland/kit-mcp@latest"],
    "env": {
      "KIT_API_KEY": "your-kit-api-key"
    }
  }
}
```

## Tools

| Tool | Actions | What You Can Do |
|------|---------|-----------------|
| `manage_subscribers` | 9 | Find, list, create, update, unsubscribe, view stats, compare engagement across up to 100 subscribers, filter by status/tags, filter by engagement metrics |
| `manage_tags` | 6 | List, create, update, tag/untag subscribers, list tagged |
| `manage_broadcasts` | 8 | List, get, create drafts, update, delete, view stats, compare stats across broadcasts, analyze per-link click data |
| `manage_forms` | 3 | List forms, list subscribers, add subscriber |
| `manage_sequences` | 3 | List sequences, add subscriber, list subscribers |
| `manage_custom_fields` | 4 | List, create, update, delete |
| `manage_purchases` | 3 | List, get, create (OAuth required) |
| `manage_segments` | 1 | List segments |
| `manage_webhooks` | 3 | List, create, delete |
| `manage_email_templates` | 1 | List templates |
| `get_account` | — | Full account overview with email and growth stats |
| `test_connection` | — | Verify your API key works |
| `bulk_operations` | 7 | Batch subscriber/tag/form/field operations (OAuth required) |

## Things You Can Ask

| What You Say | What Happens |
|-------------|--------------|
| "How's my email list doing?" | Account stats, subscriber count, growth trends |
| "Find dan@example.com" | Subscriber profile with tags, custom fields, engagement stats |
| "Who are my most engaged subscribers?" | Engagement-filtered list ranked by open/click rates |
| "Show me my recent broadcasts" | Broadcasts with status (draft/scheduled/sent) |
| "How did my last broadcast perform?" | Open rate, click rate, unsubscribes, per-link click data |
| "Which links got the most clicks?" | Per-link click analytics for any broadcast |
| "Compare my broadcast performance" | Side-by-side stats across all broadcasts |
| "Create a tag called vip-customers" | Creates the tag in Kit |
| "Tag dan@example.com with vip-customers" | Applies the tag |
| "Draft a broadcast with subject 'Big News'" | Creates a draft (doesn't send) |

## Authentication

**API Key** (covers most features): Get at [kit.com → Developer](https://app.kit.com/account/developer). Set as `KIT_API_KEY`.

**OAuth Token** (optional, for purchases and bulk operations): Set `KIT_OAUTH_TOKEN` alongside your API key.

```json
{
  "env": {
    "KIT_API_KEY": "your-api-key",
    "KIT_OAUTH_TOKEN": "your-oauth-token"
  }
}
```

Rate limits enforced automatically: 120 req/min (API key) or 600 req/min (OAuth), with retry + backoff on 429s.

## Architecture: Why 13 Tools Instead of 29+

Most MCP servers create one tool per API endpoint. For Kit's API, that means 29+ tools — which causes real problems:

- **Context bloat** — 8,000+ tokens just for tool definitions, leaving less room for your actual conversation
- **Poor accuracy** — AI tool selection degrades measurably beyond 20 tools ([research](https://arxiv.org/abs/2305.15334))
- **Compatibility** — Cursor has a hard limit of 40 tools across all servers; 29 tools from one server leaves almost no room for others

This server uses 13 composite tools with a discriminated `action` parameter. Same API coverage, 60% fewer tokens, better accuracy. Each tool groups related operations (e.g., all subscriber actions under `manage_subscribers`) so the AI picks the right tool on the first try.

## Error Handling

Errors include recovery hints that Claude can act on:

```
Error 401: Invalid API key
Recovery: Check your KIT_API_KEY. Find your key at kit.com → Account Settings → Developer.
```

- **429 (rate limit)**: Automatic retry with exponential backoff, up to 3 attempts
- **5xx (server error)**: Automatic retry once
- **422 (validation)**: No retry — returns the error immediately with a fix suggestion

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module" or npx errors | Make sure Node.js 22+ is installed: `node --version` |
| "Invalid API key" | Double-check your key at [kit.com → Developer](https://app.kit.com/account/developer) |
| Tools don't appear in Claude | Fully quit and restart Claude Desktop (not just close the window) |
| "requires OAuth authentication" | `manage_purchases` and `bulk_operations` need `KIT_OAUTH_TOKEN` |
| Rate limit errors | Automatic — the server retries with backoff. If persistent, wait 60 seconds |

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Production build
npm test             # Unit tests (179 tests)
npm run test:int     # Integration tests (requires KIT_API_KEY)
npm run lint         # Biome check
npm run typecheck    # TypeScript check
```

## License

MIT
