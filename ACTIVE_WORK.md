# Active Work

Last updated: 2026-03-16

## In Progress

Working on: Make GitHub repo public + update README to differentiate from competitors
Key files: README.md, GitHub repo settings

## Completed Today

- Added `compare_stats` action to manage_subscribers (batch engagement ranking, up to 100 subscribers)
- Added `formatSubscriberComparison` formatter (ranked by open rate)
- Rewrote tool descriptions with prescriptive engagement workflow
- Bumped version to 1.3.1
- 8 new tests (179 total passing)

## Context

- v1.3.1 ready to commit and push
- Pre-existing v1.2.0 changes (broadcast list_stats, get_clicks, engagement_filter) included
- Real-world testing showed Claude fails to find engagement data without explicit workflow guidance in descriptions

## Next Up

- Test engagement ranking workflow in fresh claude.ai chat
- npm publish v1.3.1
- Consider dedicated `top_engaged` action if description changes don't solve the workflow problem
