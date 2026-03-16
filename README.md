# @dancumberland/kit-mcp

Agent-optimized MCP server for [Kit.com](https://kit.com) (formerly ConvertKit) email marketing. 13 composite tools covering 100% of the Kit V4 API with formatted responses, rate limiting, and typed errors.

## What This Does

This connects Claude to your Kit.com email marketing account. Once set up, you can ask Claude things like:

- "How many subscribers do I have?"
- "Show me my broadcast stats from last week"
- "Tag everyone who signed up through my landing page"
- "Create a draft broadcast for my newsletter"
- "Find the subscriber dan@example.com and show me their engagement stats"

No coding required — just set it up and start talking to Claude about your Kit account.

## Prerequisites

1. **Node.js 22+** — Download from [nodejs.org](https://nodejs.org). To check if you have it, open Terminal and run `node --version`.
2. **A Kit.com account** — Free or paid, any plan works.
3. **Your Kit API key** — Go to [kit.com → Account Settings → Developer](https://app.kit.com/account/developer) and copy your API key. It starts with `kit_`.

## Setup: Claude Desktop App (Recommended)

This is the easiest way to get started. Works on Mac and Windows.

### Step 1: Find your config file

**Mac:**
Open Terminal and run:
```bash
open ~/Library/Application\ Support/Claude/
```
This opens the folder containing `claude_desktop_config.json`. Open that file in any text editor.

**Windows:**
Open File Explorer and go to:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Add the Kit MCP server

If the file is empty or doesn't exist, paste this entire block (replace `your-kit-api-key` with your actual key):

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

If the file already has other MCP servers, add the `"kit"` entry inside the existing `"mcpServers"` block. Make sure to add a comma after the previous server entry:

```json
{
  "mcpServers": {
    "some-other-server": {
      "...": "..."
    },
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

### Step 3: Restart Claude Desktop

Fully quit the Claude Desktop app (not just close the window) and reopen it. On Mac, right-click the dock icon and choose Quit, then reopen.

### Step 4: Verify it works

Start a new conversation and say:

> Test my Kit connection

Claude should respond with your account name, auth method, and rate limit. If you see an error, double-check your API key.

## Setup: Claude Desktop with Cowork

[Cowork](https://www.anthropic.com/research/cowork) is Claude Desktop's background agent that can run tasks on a schedule. Once you've completed the Claude Desktop setup above, Cowork automatically has access to your Kit tools.

### Example Cowork Tasks

Open Cowork (click the Cowork icon in Claude Desktop) and try tasks like:

**Daily subscriber report:**
> Every morning at 8am, check my Kit account stats and give me a summary of subscriber growth, email performance, and any broadcasts sent in the last 24 hours.

**Weekly broadcast review:**
> Every Monday at 9am, pull my broadcast stats from the past week and summarize open rates, click rates, and unsubscribes across all sent broadcasts.

**New subscriber monitor:**
> Every evening, list my newest subscribers from today and show me which forms or sequences they came through.

**Tag audit:**
> Every Friday, list all my tags and tell me which ones have fewer than 10 subscribers (candidates for cleanup).

Cowork uses the same MCP server configuration as Claude Desktop, so no additional setup is needed.

## Setup: Claude Code (CLI)

Add to your project's `.claude/settings.local.json` or global `~/.claude/settings.json`:

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

Restart Claude Code. The 13 Kit tools will be available in your session.

## Setup: Cursor

1. Open Cursor Settings (Cmd+, on Mac)
2. Search for "MCP" in settings
3. Click "Add MCP Server"
4. Add this configuration:

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
| `manage_subscribers` | 7 | Find, list, create, update, unsubscribe, view stats, filter |
| `manage_tags` | 6 | List, create, update, tag/untag subscribers, list tagged |
| `manage_broadcasts` | 6 | List, get, create drafts, update, delete, view stats |
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

## Things You Can Ask Claude

Once set up, just talk to Claude naturally. Here are some examples:

| What You Say | What Happens |
|-------------|--------------|
| "How's my email list doing?" | Shows account stats, subscriber count, growth trends |
| "Find dan@example.com" | Looks up subscriber with tags, custom fields, engagement stats |
| "Show me my recent broadcasts" | Lists broadcasts with status (draft/scheduled/sent) |
| "How did my last broadcast perform?" | Shows open rate, click rate, unsubscribes |
| "Create a tag called vip-customers" | Creates the tag in your Kit account |
| "Tag dan@example.com with vip-customers" | Applies the tag to that subscriber |
| "List everyone in my Welcome Series sequence" | Shows subscribers enrolled in that sequence |
| "What forms do I have?" | Lists all your opt-in forms |
| "Draft a broadcast with subject 'Big News'" | Creates a draft broadcast (doesn't send it) |
| "Show me my custom fields" | Lists all custom subscriber fields |

## Authentication

**API Key** (covers most features): Get yours at [kit.com → Account Settings → Developer](https://app.kit.com/account/developer). Set it as `KIT_API_KEY` in your config.

**OAuth Token** (optional, for purchases and bulk operations): Set `KIT_OAUTH_TOKEN` alongside your API key if you need `manage_purchases` or `bulk_operations`.

```json
{
  "env": {
    "KIT_API_KEY": "your-api-key",
    "KIT_OAUTH_TOKEN": "your-oauth-token"
  }
}
```

Rate limits are enforced automatically: 120 req/min (API key) or 600 req/min (OAuth).

## Why 13 Tools Instead of 29+?

Most MCP servers create one tool per API endpoint. For Kit's API, that means 29+ tools — which causes problems:

- **Context bloat** — 8,000+ tokens just for tool definitions
- **Poor accuracy** — AI tool selection degrades beyond 20 tools
- **Compatibility issues** — Cursor has a hard limit of 40 tools across all servers

This server uses 13 composite tools with an `action` parameter instead. Same coverage, 60% fewer tokens, better accuracy.

## Error Handling

Errors include recovery hints that Claude can act on:

```
Error 401: Invalid API key
Recovery: Check your KIT_API_KEY. Find your key at kit.com → Account Settings → Developer.
```

Rate limit errors (429) automatically retry up to 3 times with backoff. Server errors (5xx) retry once. Validation errors (422) never retry.

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
npm test             # Unit tests (154 tests)
npm run test:int     # Integration tests (requires KIT_API_KEY)
npm run lint         # Biome check
npm run typecheck    # TypeScript check
```

## License

MIT
