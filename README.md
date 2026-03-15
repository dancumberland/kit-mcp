# @dancumberland/kit-mcp

Agent-optimized MCP server for [Kit.com](https://kit.com) email marketing. 13 composite tools covering 100% of the Kit V4 API with formatted responses, rate limiting, and typed errors.

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
| `manage_purchases` | 3 | List, get, create (OAuth) |
| `manage_segments` | 1 | List |
| `manage_webhooks` | 3 | List, create, delete |
| `manage_email_templates` | 1 | List |
| `get_account` | — | Account overview with stats |
| `test_connection` | — | Verify API key |
| `bulk_operations` | 7 | Batch subscriber/tag/form/field operations (OAuth) |

## Why Composite Tools?

Most MCP servers expose one tool per API endpoint (29+ tools for Kit). This causes:
- Context bloat (~8,000+ tokens just for tool definitions)
- Poor agent accuracy at 20+ tools
- Cursor incompatibility (40 tool hard limit)

Our 13 composite tools use a discriminated union `action` parameter. The agent picks the resource, then specifies the operation. Result: ~3,500 tokens of definitions (60% less), better accuracy, and full Cursor compatibility.

## Authentication

**API Key** (default): Set `KIT_API_KEY` environment variable. Covers all non-bulk endpoints.

**OAuth** (optional): Set `KIT_OAUTH_TOKEN` for bulk operations and purchase tracking.

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Production build
npm test             # Run tests
npm run lint         # Biome check
npm run typecheck    # TypeScript check
```

## License

MIT
