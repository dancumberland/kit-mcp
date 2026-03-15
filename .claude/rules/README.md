# Path-Scoped Rules

This directory contains rule files that auto-activate based on which files Claude is editing.

## Convention

Each `.md` file uses `paths:` frontmatter to scope when it activates:

```yaml
---
paths:
  - src/api/**
  - src/lib/database.*
---
```

## What Goes Here

- Platform constraints (e.g., "never use X API, use Y instead")
- Build quirks (e.g., "must use --ignore-scripts with npm install")
- Critical "never do X" rules for specific files
- File-specific patterns that must be followed

## What Does NOT Go Here

- General architecture docs → `.claude/CLAUDE.md`
- Debugging insights and learned patterns → `memory/`
- Current task tracking → `ACTIVE_WORK.md`

## Example

```markdown
---
paths:
  - src/database/**
---

# Database Rules

## Never use raw SQL
Always use the query builder. Raw SQL bypasses the audit log.

## Migration naming
Format: `YYYYMMDD_HHMMSS_description.sql`
```
