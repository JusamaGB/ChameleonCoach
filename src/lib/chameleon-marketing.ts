import type { SupabaseClient } from "@supabase/supabase-js"
import { audit, listAudit, listEntries, readEntry, recentMessages, sendMessage, updateEntry, writeEntry } from "@/lib/chameleon-memory/service"

type JsonPrimitive = string | number | boolean | null
interface JsonRecord {
  [key: string]: JsonPrimitive | JsonRecord | Array<JsonPrimitive | JsonRecord>
}

export type MarketingLead = {
  key: string
  full_name: string
  platform: string
  handle: string
  source: string
  stage: string
  temperature: string
  notes: string
  last_contacted_at: string | null
  next_follow_up_at: string | null
  status: string
  owner_user_id: string
  created_at?: string
  updated_at?: string
}

export type MarketingTask = {
  key: string
  task_type: string
  status: string
  priority: string
  lead_key: string | null
  channel: string
  objective: string
  campaign_profile: string
  required_output_format: string
  constraints: string[]
  banned_claims: string[]
  requested_revision_note?: string
  claimed_at?: string | null
  completed_at?: string | null
  error_message?: string | null
  created_at?: string
  updated_at?: string
}

export type MarketingDraft = {
  key: string
  task_key: string | null
  lead_key: string | null
  channel: string
  draft_type: string
  content: string
  variant_label: string
  status: string
  campaign_profile: string
  objective: string
  reviewer_note?: string
  approved_by?: string | null
  approved_at?: string | null
  sent_at?: string | null
  outcome_note?: string | null
  revision_count?: number
  created_at?: string
  updated_at?: string
}

export type MarketingRunnerState = {
  key: string
  agent: string
  status: string
  current_task_key: string | null
  heartbeat_at: string | null
  last_error: string | null
  pending_queue_count: number
  recent_actions: string[]
}

export type MarketingSnapshot = {
  leads: MarketingLead[]
  tasks: MarketingTask[]
  drafts: MarketingDraft[]
  runner: MarketingRunnerState
  overview: {
    new_leads: number
    drafts_awaiting_review: number
    approved_ready_to_send: number
    follow_ups_due: number
    pending_tasks: number
  }
  activity: Awaited<ReturnType<typeof listAudit>>
  messages: Awaited<ReturnType<typeof recentMessages>>
}

const TASK_PREFIX = "task_"
const DRAFT_PREFIX = "draft_"
const RUNNER_KEY = "runner_marketing"

function nowIso() {
  return new Date().toISOString()
}

function makeKey(prefix: string) {
  return `${prefix}${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function asLead(key: string, data: Record<string, any>): MarketingLead {
  return {
    key,
    full_name: data.full_name ?? "",
    platform: data.platform ?? "",
    handle: data.handle ?? "",
    source: data.source ?? "",
    stage: data.stage ?? "new",
    temperature: data.temperature ?? "warm",
    notes: data.notes ?? "",
    last_contacted_at: data.last_contacted_at ?? null,
    next_follow_up_at: data.next_follow_up_at ?? null,
    status: data.status ?? "active",
    owner_user_id: data.owner_user_id ?? "",
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function asTask(key: string, data: Record<string, any>): MarketingTask {
  return {
    key,
    task_type: data.task_type ?? "draft_dm_reply",
    status: data.status ?? "queued",
    priority: data.priority ?? "normal",
    lead_key: data.lead_key ?? null,
    channel: data.channel ?? "dm",
    objective: data.objective ?? "",
    campaign_profile: data.campaign_profile ?? "default",
    required_output_format: data.required_output_format ?? "2-3 variants",
    constraints: Array.isArray(data.constraints) ? data.constraints : [],
    banned_claims: Array.isArray(data.banned_claims) ? data.banned_claims : [],
    requested_revision_note: data.requested_revision_note,
    claimed_at: data.claimed_at ?? null,
    completed_at: data.completed_at ?? null,
    error_message: data.error_message ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function asDraft(key: string, data: Record<string, any>): MarketingDraft {
  return {
    key,
    task_key: data.task_key ?? null,
    lead_key: data.lead_key ?? null,
    channel: data.channel ?? "dm",
    draft_type: data.draft_type ?? "reply",
    content: data.content ?? "",
    variant_label: data.variant_label ?? "A",
    status: data.status ?? "drafted",
    campaign_profile: data.campaign_profile ?? "default",
    objective: data.objective ?? "",
    reviewer_note: data.reviewer_note,
    approved_by: data.approved_by ?? null,
    approved_at: data.approved_at ?? null,
    sent_at: data.sent_at ?? null,
    outcome_note: data.outcome_note ?? null,
    revision_count: data.revision_count ?? 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function normalizeRunner(data: Record<string, any> | null, pendingQueueCount: number): MarketingRunnerState {
  return {
    key: RUNNER_KEY,
    agent: data?.agent ?? "MARKETING",
    status: data?.status ?? "offline",
    current_task_key: data?.current_task_key ?? null,
    heartbeat_at: data?.heartbeat_at ?? null,
    last_error: data?.last_error ?? null,
    pending_queue_count: pendingQueueCount,
    recent_actions: Array.isArray(data?.recent_actions) ? data.recent_actions : [],
  }
}

export async function getMarketingSnapshot(supabase: SupabaseClient): Promise<MarketingSnapshot> {
  const [leadKeys, stateKeys, contentKeys, runnerRaw, activity, messages] = await Promise.all([
    listEntries(supabase, "leads"),
    listEntries(supabase, "state"),
    listEntries(supabase, "content"),
    readEntry(supabase, "state", RUNNER_KEY),
    listAudit(supabase, { limit: 30 }),
    recentMessages(supabase, 12),
  ])

  const [leadEntries, stateEntries, contentEntries] = await Promise.all([
    Promise.all(leadKeys.keys.map((item) => readEntry(supabase, "leads", item.key))),
    Promise.all(stateKeys.keys.map((item) => readEntry(supabase, "state", item.key))),
    Promise.all(contentKeys.keys.map((item) => readEntry(supabase, "content", item.key))),
  ])

  const leads = leadEntries
    .filter(Boolean)
    .map((entry) => asLead(entry!.key, entry!.data as Record<string, any>))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))

  const tasks = stateEntries
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => entry.key.startsWith(TASK_PREFIX))
    .map((entry) => asTask(entry.key, entry.data as Record<string, any>))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))

  const drafts = contentEntries
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => entry.key.startsWith(DRAFT_PREFIX))
    .map((entry) => asDraft(entry.key, entry.data as Record<string, any>))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))

  const pendingTasks = tasks.filter((task) => ["queued", "claimed", "revision_requested"].includes(task.status))
  const followUpsDue = leads.filter((lead) => lead.next_follow_up_at && lead.next_follow_up_at <= nowIso() && lead.status !== "archived")

  return {
    leads,
    tasks,
    drafts,
    runner: normalizeRunner((runnerRaw?.data as Record<string, any> | null) ?? null, pendingTasks.length),
    overview: {
      new_leads: leads.filter((lead) => lead.stage === "new").length,
      drafts_awaiting_review: drafts.filter((draft) => ["drafted", "needs_review", "revision_requested"].includes(draft.status)).length,
      approved_ready_to_send: drafts.filter((draft) => ["approved", "ready_to_send"].includes(draft.status)).length,
      follow_ups_due: followUpsDue.length,
      pending_tasks: pendingTasks.length,
    },
    activity,
    messages,
  }
}

export async function createMarketingLead(
  supabase: SupabaseClient,
  userId: string,
  input: {
    full_name: string
    platform: string
    handle: string
    source: string
    stage: string
    temperature: string
    notes: string
    next_follow_up_at?: string | null
    status?: string
  }
) {
  const key = makeKey("lead_")
  const timestamp = nowIso()
  const payload: JsonRecord = {
    owner_user_id: userId,
    full_name: input.full_name.trim(),
    platform: input.platform.trim(),
    handle: input.handle.trim(),
    source: input.source.trim(),
    stage: input.stage,
    temperature: input.temperature,
    notes: input.notes.trim(),
    last_contacted_at: null,
    next_follow_up_at: input.next_follow_up_at ?? null,
    status: input.status ?? "active",
    created_at: timestamp,
    updated_at: timestamp,
  }

  await writeEntry(supabase, "leads", key, payload)
  await audit(supabase, {
    op: "marketing_lead_create",
    sector: "leads",
    key,
    agent: userId,
    summary: `Created marketing lead ${payload.full_name}`,
    meta: { platform: payload.platform as string, stage: payload.stage as string },
  })

  return key
}

export async function updateMarketingLead(
  supabase: SupabaseClient,
  userId: string,
  leadKey: string,
  patch: Partial<MarketingLead>
) {
  const result = await updateEntry(supabase, "leads", leadKey, {
    ...patch,
    updated_at: nowIso(),
  })

  if (!result) {
    throw new Error("Lead not found")
  }

  await audit(supabase, {
    op: "marketing_lead_update",
    sector: "leads",
    key: leadKey,
    agent: userId,
    summary: `Updated marketing lead ${leadKey}`,
    meta: { fields: Object.keys(patch) },
  })

  return result
}

export async function createMarketingTask(
  supabase: SupabaseClient,
  userId: string,
  input: {
    lead_key: string
    task_type: string
    channel: string
    objective: string
    campaign_profile: string
    required_output_format?: string
    constraints?: string[]
    banned_claims?: string[]
    priority?: string
  }
) {
  const lead = await readEntry(supabase, "leads", input.lead_key)
  if (!lead) {
    throw new Error("Lead not found")
  }

  const key = makeKey(TASK_PREFIX)
  const timestamp = nowIso()
  const payload: JsonRecord = {
    owner_user_id: userId,
    lead_key: input.lead_key,
    task_type: input.task_type,
    status: "queued",
    priority: input.priority ?? "normal",
    channel: input.channel,
    objective: input.objective,
    campaign_profile: input.campaign_profile,
    required_output_format: input.required_output_format ?? "2-3 variants plus short rationale",
    constraints: input.constraints ?? [],
    banned_claims: input.banned_claims ?? [],
    lead_context: lead.data as JsonRecord,
    created_at: timestamp,
    updated_at: timestamp,
  }

  await writeEntry(supabase, "state", key, payload)
  await sendMessage(supabase, {
    sender: "SYSTEM",
    tag: "TASK_QUEUED",
    content: `Task ${key} queued for ${input.lead_key}: ${input.task_type}`,
    type: "broadcast",
    priority: "normal",
  })
  await audit(supabase, {
    op: "marketing_task_create",
    sector: "state",
    key,
    agent: userId,
    summary: `Queued ${input.task_type} for ${input.lead_key}`,
    meta: { channel: input.channel, campaign_profile: input.campaign_profile },
  })

  return key
}

function assertDraftStatusTransition(currentStatus: string, nextStatus: string) {
  const allowed: Record<string, string[]> = {
    drafted: ["needs_review", "approved", "rejected", "revision_requested"],
    needs_review: ["approved", "rejected", "revision_requested"],
    rejected: ["revision_requested"],
    revision_requested: ["approved", "rejected", "drafted", "needs_review"],
    approved: ["ready_to_send", "sent", "rejected"],
    ready_to_send: ["sent", "rejected"],
    sent: [],
    failed: ["revision_requested"],
  }

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw new Error(`Cannot move draft from ${currentStatus} to ${nextStatus}`)
  }
}

export async function updateDraftWorkflow(
  supabase: SupabaseClient,
  userId: string,
  input: {
    draft_key: string
    action: "approve" | "reject" | "request_revision" | "edit_and_approve" | "mark_ready" | "mark_sent"
    content?: string
    reviewer_note?: string
    outcome_note?: string
  }
) {
  const draft = await readEntry(supabase, "content", input.draft_key)
  if (!draft) {
    throw new Error("Draft not found")
  }

  const current = asDraft(draft.key, draft.data as Record<string, any>)
  const timestamp = nowIso()
  let nextStatus = current.status
  const patch: Record<string, any> = { updated_at: timestamp }

  switch (input.action) {
    case "approve":
      nextStatus = current.status === "approved" ? "approved" : "approved"
      if (current.status !== "approved") {
        assertDraftStatusTransition(current.status, nextStatus)
      }
      patch.status = nextStatus
      patch.approved_by = userId
      patch.approved_at = timestamp
      if (input.reviewer_note) patch.reviewer_note = input.reviewer_note
      break
    case "reject":
      assertDraftStatusTransition(current.status, "rejected")
      patch.status = "rejected"
      patch.reviewer_note = input.reviewer_note ?? "Rejected for revision"
      break
    case "request_revision": {
      assertDraftStatusTransition(current.status, "revision_requested")
      patch.status = "revision_requested"
      patch.reviewer_note = input.reviewer_note ?? "Revision requested"
      patch.revision_count = (current.revision_count ?? 0) + 1
      if (current.task_key) {
        const revisionTaskKey = makeKey(TASK_PREFIX)
        await writeEntry(supabase, "state", revisionTaskKey, {
          owner_user_id: userId,
          lead_key: current.lead_key,
          task_type: "revise_marketing_copy",
          status: "queued",
          priority: "high",
          channel: current.channel,
          objective: current.objective,
          campaign_profile: current.campaign_profile,
          required_output_format: "revised single best version plus rationale",
          constraints: [],
          banned_claims: [],
          source_draft_key: current.key,
          requested_revision_note: patch.reviewer_note,
          created_at: timestamp,
          updated_at: timestamp,
        })
        await audit(supabase, {
          op: "marketing_revision_task_create",
          sector: "state",
          key: revisionTaskKey,
          agent: userId,
          summary: `Queued revision task for ${current.key}`,
          meta: { source_draft_key: current.key },
        })
      }
      break
    }
    case "edit_and_approve":
      assertDraftStatusTransition(current.status, "approved")
      patch.status = "approved"
      patch.approved_by = userId
      patch.approved_at = timestamp
      patch.content = input.content ?? current.content
      if (input.reviewer_note) patch.reviewer_note = input.reviewer_note
      break
    case "mark_ready":
      assertDraftStatusTransition(current.status, "ready_to_send")
      patch.status = "ready_to_send"
      break
    case "mark_sent":
      if (!["approved", "ready_to_send"].includes(current.status)) {
        throw new Error("Draft must be approved before marking as sent")
      }
      patch.status = "sent"
      patch.sent_at = timestamp
      patch.outcome_note = input.outcome_note ?? ""
      break
  }

  const updated = await updateEntry(supabase, "content", current.key, patch)
  if (!updated) {
    throw new Error("Draft not found after update")
  }

  if (input.action === "mark_sent" && current.lead_key) {
    await updateEntry(supabase, "leads", current.lead_key, {
      last_contacted_at: timestamp,
      updated_at: timestamp,
    })
  }

  await audit(supabase, {
    op: "marketing_draft_transition",
    sector: "content",
    key: current.key,
    agent: userId,
    summary: `Draft ${current.key} -> ${patch.status ?? current.status}`,
    meta: { action: input.action, reviewer_note: input.reviewer_note ?? "", outcome_note: input.outcome_note ?? "" },
  })

  return updated
}
