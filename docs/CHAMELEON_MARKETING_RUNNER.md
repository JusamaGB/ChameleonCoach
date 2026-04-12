# Chameleon Marketing Runner Contract

This is the v1 contract for the local Codex marketing runner.

## Identity

- agent id: `MARKETING` by default
- transport: local MCP stdio wrapper at `scripts/chameleon-memory-mcp.mjs`
- source of truth: Chameleon memory in this repo only
- local process entrypoint: `scripts/chameleon-marketing-runner.mjs`
- local start command: `npm run runner:marketing`

## Stable rules

- draft only
- approval required before anything becomes sendable
- no outbound sending
- no deletion of logs, drafts, or audit history
- one claimed task at a time
- all state changes written back to Chameleon memory

## Task recipes

- `scan_reddit_leads`
- `lead_summary`
- `draft_reddit_outreach`
- `draft_dm_reply`
- `draft_follow_up`
- `draft_social_post`
- `revise_marketing_copy`

## Reddit-first behavior

The runner is Reddit-first in v1.

- it can auto-queue `scan_reddit_leads`
- it searches configured subreddits and search phrases
- it scores likely leads looking for coaches/operators using Google Sheets or spreadsheet-heavy workflows
- it writes qualified leads into `leads`
- it writes Reddit source records into `conversations`
- it queues `lead_summary` and `draft_reddit_outreach` follow-on tasks
- it never sends anything externally

## Task storage

Queued tasks live in the `state` sector with keys shaped like `task_<timestamp>_<rand>`.

Minimum payload fields:

```json
{
  "lead_key": "lead_...",
  "task_type": "draft_reddit_outreach",
  "status": "queued",
  "priority": "normal",
  "channel": "reddit_dm",
  "objective": "Draft a natural Reddit outreach message",
  "campaign_profile": "reddit_google_sheets",
  "required_output_format": "2-3 variants plus short rationale",
  "constraints": ["keep it concise"],
  "banned_claims": ["do not promise medical outcomes"]
}
```

## Runner state

Runner heartbeat lives in `state/runner_marketing`.

Expected shape:

```json
{
  "agent": "MARKETING",
  "status": "running",
  "current_task_key": "task_...",
  "heartbeat_at": "2026-04-12T12:00:00.000Z",
  "last_error": null,
  "pending_queue_count": 4,
  "recent_actions": [
    "Claimed task task_...",
    "Wrote 3 draft variants to content/draft_..."
  ]
}
```

## Draft output

Generated drafts live in the `content` sector with keys shaped like `draft_<timestamp>_<rand>`.

Expected payload:

```json
{
  "task_key": "task_...",
  "lead_key": "lead_...",
  "channel": "reddit_dm",
  "draft_type": "reddit_outreach",
  "content": "Draft body here",
  "variant_label": "A",
  "status": "drafted",
  "campaign_profile": "reddit_google_sheets",
  "objective": "Reply to the lead"
}
```

## Required env

- `CHAMELEON_MCP_API_KEY`
- `CHAMELEON_MEMORY_BASE_URL`
- `CHAMELEON_AGENT_ID`
- `OPENAI_API_KEY` for AI drafting

Optional Reddit config:

- `CHAMELEON_REDDIT_AUTOSCAN`
- `CHAMELEON_REDDIT_AUTOSCAN_MINUTES`
- `CHAMELEON_REDDIT_SUBREDDITS`
- `CHAMELEON_REDDIT_SEARCH_TERMS`
- `CHAMELEON_BUDGET_MODE`
- `CHAMELEON_OPENAI_MODEL_DISCOVERY`
- `CHAMELEON_OPENAI_MODEL_DRAFTING`
- `CHAMELEON_OPENAI_MODEL_REVISION`
- `CHAMELEON_MAX_DRAFT_VARIANTS`
- `CHAMELEON_MAX_OUTPUT_TOKENS`

Recommended low-cost default:

- discovery and lead summary on `gpt-5-nano`
- outreach and follow-up drafting on `gpt-5-mini`
- revision on `gpt-5-mini`
- max 2 variants
- max 500 output tokens

## Lifecycle rules

- queued task -> claimed by runner
- claimed task -> one or more `content/draft_*` entries
- `scan_reddit_leads` can create new leads plus follow-on tasks
- new drafts should land as `drafted` or `needs_review`
- rejected drafts can become `revision_requested`
- revision requests should create a new `revise_marketing_copy` task
- only the operator UI can mark drafts `approved`, `ready_to_send`, or `sent`
- sent drafts can trigger `follow_ups` scheduling and later `draft_follow_up` task creation
