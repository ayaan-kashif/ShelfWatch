# Supabase setup

Updated: 2026-10-05 (Asia/Karachi).

## Project and connection

- Project: ShelfWatch MINE.
- Project reference: `txsrjqirlcxgddkkwfdl`.
- Global Codex MCP server: `supabase`.
- Endpoint: `https://mcp.supabase.com/mcp?project_ref=txsrjqirlcxgddkkwfdl&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching`.
- Updated the existing named Supabase entry from its previous project to this ShelfWatch project. Other server entries were preserved.
- The add command detected OAuth support and automatically started authentication. The process completed with `Successfully logged in.`
- Verified `codex mcp get supabase`: enabled and pointing to the requested ShelfWatch project.
- Verified `codex mcp list --json`: `supabase` is enabled with `auth_status: o_auth`; `21st` is also enabled with bearer-token authentication.

The sandboxed shell exposes an isolated Codex configuration and initially returned no MCP entries. The normal user shell, used with approved setup permissions, reports the configured servers correctly. This was a configuration visibility difference, not removal of the 21st setup.

## Installed optional skills

Installed into the personal Codex skills directory with the Skill Installer helper, using official Supabase repositories:

- `supabase` from `supabase/agent-skills`.
- `supabase-postgres-best-practices` from `supabase/agent-skills`.
- `supabase-server` from `supabase/server`.

The skills become available in the skill catalog on the next turn. Their source files are already installed locally.

## Application credentials

The user supplied the public project URL and publishable key. Application environment wiring is tracked in the project implementation log. This document contains no credentials.

The original supplied secret key was masked. The user later added the full server credential locally, and connectivity was verified. Keep secrets outside committed source and browser code. OAuth authentication for Codex MCP is independent of application user authentication and application API keys.

## Live setup status

Native Supabase tools are available and verified against ShelfWatch MINE. Both the initial schema and the four-index follow-up migration have been applied successfully. All 15 application tables have RLS enabled; PostGIS is installed and the photo bucket is private. The supplied full local credentials now connect successfully. Overview, history and rewards return real empty database results; anonymous admin APIs reject access.

Prisma migration history reconciliation uses the session pooler through `DIRECT_URL`; application traffic continues to use `DATABASE_URL`. See PROGRESS.md for final check status. Codex OAuth and application credentials are separate connections.

## Official references

- [OpenAI MCP setup](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
- [Supabase MCP setup](https://supabase.com/docs/guides/ai-tools/mcp).
- [Supabase agent skills](https://github.com/supabase/agent-skills).
- [Supabase Server skill](https://github.com/supabase/server/tree/main/skills/supabase-server).
