# Chameleon Marketing Runner Contract

This is the v1 contract for the local Codex marketing runner.

## Identity

- agent id: `MARKETING` by default
- transport: local MCP stdio wrapper at `scripts/chameleon-memory-mcp.mjs`
- source of truth: Chameleon memory in this repo only

## Stable rules

- draft only
- approval required before anything becomes sendable
- no outbound sending
- no deletion of logs, drafts, or audit history
- one claimed task at a time
- all state changes written back to Chameleon memory

## Task recipes

- `lead_summary`
- `draft_dm_reply`
- `draft_follow_up`
- `draft_social_post`
- `revise_marketing_copy`

## Task storage

Queued tasks live in the `state` sector with keys shaped like `task_<timestamp>_<rand>`.

Minimum payload fields:

```json
{
  "lead_key": "lead_...",
  "task_type": "draft_dm_reply",
  "status": "queued",
  "priority": "normal",
  "channel": "dm",
  "objective": "Reply to a warm lead and move them toward a call",
  "campaign_profile": "default",
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
  "channel": "dm",
  "draft_type": "reply",
  "content": "Draft body here",
  "variant_label": "A",
  "status": "drafted",
  "campaign_profile": "default",
  "objective": "Reply to the lead"
}
```

## Lifecycle rules

- queued task -> claimed by runner
- claimed task -> one or more `content/draft_*` entries
- new drafts should land as `drafted` or `needs_review`
- rejected drafts can become `revision_requested`
- revision requests should create a new `revise_marketing_copy` task
- only the operator UI can mark drafts `approved`, `ready_to_send`, or `sent`
