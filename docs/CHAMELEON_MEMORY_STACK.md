# Chameleon Memory Stack

This project has its own Chameleon-specific memory stack. It does not share runtime code, data, routes, or database tables with `Z:\SDK`.

## Separation boundary

- `Z:\SDK\hustle-agent` remains the Hustle implementation.
- `Z:\G-Fitness` contains its own Chameleon memory schema, API routes, and MCP wrapper.
- Chameleon memory uses this app's Supabase project, not Neon.
- Chameleon memory tables are prefixed with `chameleon_` so they stay isolated from the rest of the product schema.

## Pieces

- Supabase schema: `supabase/migrations/030_chameleon_memory.sql`
- Server logic: `src/lib/chameleon-memory/`
- HTTP routes: `src/app/api/chameleon-memory/`
- MCP stdio wrapper: `scripts/chameleon-memory-mcp.mjs`

## Environment

Add these variables to local and deployed env:

- `CHAMELEON_MCP_API_KEY`
- `CHAMELEON_MEMORY_BASE_URL`
- `CHAMELEON_AGENT_ID`
- `CHAMELEON_AGENT_NAME`
- `CHAMELEON_LAUNCH_DATE`

Suggested local values:

```env
CHAMELEON_MCP_API_KEY=replace-with-a-long-random-secret
CHAMELEON_MEMORY_BASE_URL=http://127.0.0.1:3000
CHAMELEON_AGENT_ID=MARKETING
CHAMELEON_AGENT_NAME=Chameleon Marketing
CHAMELEON_LAUNCH_DATE=2026-04-12
```

## API surface

- `GET /api/chameleon-memory/health`
- `GET /api/chameleon-memory/sectors`
- `GET /api/chameleon-memory/clock`
- `GET /api/chameleon-memory/audit`
- `GET /api/chameleon-memory/memory/:sector`
- `GET /api/chameleon-memory/memory/:sector/:key`
- `PUT /api/chameleon-memory/memory/:sector/:key`
- `PATCH /api/chameleon-memory/memory/:sector/:key`
- `DELETE /api/chameleon-memory/memory/:sector/:key`
- `GET /api/chameleon-memory/memory/:sector/search/:query`
- `POST /api/chameleon-memory/messages/send`
- `GET /api/chameleon-memory/messages/recent`
- `GET /api/chameleon-memory/messages/poll`
- `POST /api/chameleon-memory/messages/cursor/advance`

All routes require `x-chameleon-api-key` or `Authorization: Bearer <key>`.

## MCP usage

Run the local MCP server against the running Next app:

```bash
node scripts/chameleon-memory-mcp.mjs
```

Required env:

```env
CHAMELEON_MCP_API_KEY=...
CHAMELEON_MEMORY_BASE_URL=http://127.0.0.1:3000
CHAMELEON_AGENT_ID=MARKETING
```

## Current scope

This is the isolated foundation:

- sectored memory storage
- single-agent team clock
- message board
- per-agent read cursors
- audit trail

It intentionally does not include the Hustle-specific Scout, Builder, lounge, or schedule flows.
