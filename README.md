# @dancumberland/kit-mcp

Agent-optimized MCP server for [Kit.com](https://kit.com) (formerly ConvertKit) email marketing. 13 composite tools covering 100% of the Kit V4 API with formatted responses, rate limiting, and typed errors.

## Quick Start

1. Get your Kit API key from [kit.com → Account Settings → Developer](https://app.kit.com/account/developer)
2. Open Claude Desktop → Settings → Developer → Edit Config
3. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kit": {
      "command": "npx",
      "args": ["-y", "@dancumberland/kit-mcp@latest"],
      "env": {
        "KIT_API_KEY": "your-key-here"
      }
    }
  }
}
```

4. Restart Claude Desktop. Say **"Test my Kit connection"** to verify.

## Tools

| Tool | Actions | Description |
|------|---------|-------------|
| `manage_subscribers` | 7 | Find, list, create, update, unsubscribe, stats, filter |
| `manage_tags` | 6 | List, create, update, tag/untag subscribers, list tagged |
| `manage_broadcasts` | 6 | List, get, create, update, delete, stats |
| `manage_forms` | 3 | List, list subscribers, add subscriber |
| `manage_sequences` | 3 | List, add subscriber, list subscribers |
| `manage_custom_fields` | 4 | List, create, update, delete |
| `manage_purchases` | 3 | List, get, create (OAuth required) |
| `manage_segments` | 1 | List |
| `manage_webhooks` | 3 | List, create, delete |
| `manage_email_templates` | 1 | List |
| `get_account` | — | Account overview with stats |
| `test_connection` | — | Verify API key |
| `bulk_operations` | 7 | Batch subscriber/tag/form/field operations (OAuth required) |

## Usage Examples

**Find a subscriber and their tags:**
```
Use manage_subscribers with action "find" and email "dan@example.com"
```
Response (~80 tokens):
```
Subscriber: Dan Cumberland (dan@example.com)
ID: 123 | State: active | Created: 2024-01-15
Tags: ai-strategy, newsletter
Custom fields: role=executive, company=Acme
```

**Create a broadcast draft:**
```
Use manage_broadcasts with action "create", subject "March Newsletter", and content "<p>Hello!</p>"
```
Response:
```
Broadcast created (ID: 42): "March Newsletter" — saved as draft
```

**Tag a subscriber:**
```
Use manage_tags with action "tag_subscriber", tag_id 5, and email "dan@example.com"
```
Response:
```
Tag 5 applied to dan@example.com.
```

**View broadcast performance:**
```
Use manage_broadcasts with action "stats" and id 42
```
Response:
```
Broadcast: "March Newsletter"
Status: completed | Recipients: 11,234

Performance:
  Open rate: 43.5%
  Click rate: 11.0%
  Unsubscribes: 23
  Total clicks: 1,234
```

## Why Composite Tools?

Most MCP servers expose one tool per API endpoint (29+ tools for Kit). This causes:
- **Context bloat** — ~8,000+ tokens just for tool definitions
- **Poor agent accuracy** — selection degrades beyond 20 tools
- **Cursor incompatibility** — hard limit of 40 tools across all servers

Our 13 composite tools use a discriminated union `action` parameter. The agent picks the resource, then specifies the operation:

| Dimension | 29 Thin Wrappers | 13 Composite Tools |
|-----------|------------------|--------------------|
| Tool definitions | ~8,000+ tokens | ~3,500 tokens |
| Agent accuracy | Degrades at 20+ | Stable at 13 |
| Cursor compatible | At risk | Safe |
| Response format | Raw JSON dumps | Formatted text (<500 tokens) |
| Error handling | HTTP status codes | Typed errors with recovery hints |
| Rate limiting | None | Sliding window with auto-retry |

## Authentication

**API Key** (default): Set `KIT_API_KEY` environment variable. Covers all endpoints except purchases and bulk operations.

```json
{
  "env": {
    "KIT_API_KEY": "your-api-key"
  }
}
```

**OAuth** (optional): Set `KIT_OAUTH_TOKEN` for `manage_purchases` and `bulk_operations`.

```json
{
  "env": {
    "KIT_API_KEY": "your-api-key",
    "KIT_OAUTH_TOKEN": "your-oauth-token"
  }
}
```

Rate limits are enforced automatically: 120 req/min (API key) or 600 req/min (OAuth).

## Error Handling

Every error includes a recovery hint the agent can act on:

```
Error 401: Invalid API key
Recovery: Check your KIT_API_KEY environment variable. Find your key at kit.com → Account Settings → Developer.
```

```
Error 429: Rate limit exceeded
Recovery: Wait 60 seconds before retrying. Current usage has hit the per-minute cap.
```

```
Error 403: bulk_operations requires OAuth authentication
Recovery: Set KIT_OAUTH_TOKEN environment variable. See README for OAuth setup guide.
```

Automatic retry: 429 errors retry up to 3 times with exponential backoff (1s, 2s, 4s). 5xx errors retry once after 1s. 422 validation errors never retry.

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Production build
npm test             # Unit tests (140 tests)
npm run test:int     # Integration tests (requires KIT_API_KEY)
npm run lint         # Biome check
npm run typecheck    # TypeScript check
```

## Tech Stack

- **TypeScript** — strict mode, zero `any` types
- **MCP SDK** — `@modelcontextprotocol/sdk`
- **Zod** — discriminated union input validation
- **Native fetch** — no axios/got/node-fetch
- **tsup** — ESM build with shebang
- **Vitest** — unit + integration tests
- **Biome** — linting + formatting

## License

MIT
