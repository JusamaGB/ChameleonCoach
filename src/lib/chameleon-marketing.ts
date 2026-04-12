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
  fit_score?: number | null
  ai_summary?: string
  discovery_reason?: string
  source_post_id?: string
  source_permalink?: string
  source_title?: string
  source_excerpt?: string
  discovered_at?: string | null
  created_at?: string
  updated_at?: string
}

export type MarketingTask = {
  key: string
  owner_user_id: string
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
  task_payload?: JsonRecord
  requested_revision_note?: string
  claimed_at?: string | null
  completed_at?: string | null
  error_message?: string | null
  created_at?: string
  updated_at?: string
}

export type MarketingDraft = {
  key: string
  owner_user_id: string
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
  autoscan_enabled?: boolean
  control_requested_at?: string | null
  last_control_action?: string | null
  last_control_acknowledged_at?: string | null
  last_startup_attempt_at?: string | null
  last_startup_status?: string | null
  last_startup_message?: string | null
  model_preferences?: {
    discovery?: string
    drafting?: string
    revision?: string
  }
  output_limits?: {
    max_draft_variants?: number
    max_output_tokens?: number
  }
  diagnostics?: {
    config_loaded?: boolean
    api_key_present?: boolean
    openai_key_present?: boolean
    memory_base_url?: string
    memory_api_reachable?: boolean
    last_reachability_check_at?: string | null
    startup_ready?: boolean
    startup_message?: string | null
  }
}

export type MarketingSettings = {
  has_openai_api_key: boolean
  openai_api_key_last4: string | null
  openai_api_key_set_at: string | null
  autoscan_enabled: boolean
  model_preferences: {
    discovery: string
    drafting: string
    revision: string
  }
  output_limits: {
    max_draft_variants: number
    max_output_tokens: number
  }
  reddit: {
    subreddits: string[]
    search_terms: string[]
  }
  token_usage: {
    model: string
    requests: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    last_used_at: string | null
  }
}

export type MarketingSnapshot = {
  leads: MarketingLead[]
  tasks: MarketingTask[]
  drafts: MarketingDraft[]
  runner: MarketingRunnerState
  settings: MarketingSettings
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

const FIXED_DISCOVERY_MODEL = "gpt-5-mini"
const FIXED_DRAFTING_MODEL = "gpt-5-mini"
const FIXED_REVISION_MODEL = "gpt-5-mini"
const FIXED_MAX_DRAFT_VARIANTS = 1
const DEFAULT_MAX_OUTPUT_TOKENS = 150
const TOKEN_USAGE_KEY = "usage_marketing_tokens"
const RUNNER_HEARTBEAT_STALE_AFTER_MS = 3 * 60 * 1000
const DEFAULT_REDDIT_SUBREDDITS = [
  "smallbusiness",
  "entrepreneur",
  "personaltraining",
  "fitnessbusiness",
  "marketing",
  "sales",
  "onlinecoaching",
]
const DEFAULT_REDDIT_SEARCH_TERMS = [
  "google sheets coach",
  "google sheets fitness coach",
  "spreadsheet personal trainer",
  "spreadsheet coaching business",
  "client onboarding spreadsheet coach",
]

export const MARKETING_TASK_TYPES = [
  "scan_reddit_leads",
  "lead_summary",
  "draft_reddit_outreach",
  "draft_dm_reply",
  "draft_follow_up",
  "draft_social_post",
  "revise_marketing_copy",
] as const

function nowIso() {
  return new Date().toISOString()
}

function makeKey(prefix: string) {
  return `${prefix}${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return Math.max(min, Math.min(max, numeric))
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const normalized = value.map((item) => String(item ?? "").trim()).filter(Boolean)
  return normalized.length > 0 ? normalized : fallback
}

function parseIsoTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function getEffectiveRunnerStatus(data: Record<string, any> | null) {
  const storedStatus = data?.status ?? "offline"
  const heartbeatAt = data?.heartbeat_at ?? null
  const heartbeatTimestamp = parseIsoTimestamp(heartbeatAt)
  const heartbeatAgeMs = heartbeatTimestamp ? Math.max(0, Date.now() - heartbeatTimestamp) : null
  const heartbeatStale = heartbeatAgeMs === null || heartbeatAgeMs > RUNNER_HEARTBEAT_STALE_AFTER_MS

  if (heartbeatStale && ["starting", "running", "idle", "error", "blocked"].includes(storedStatus)) {
    return {
      status: "offline",
      heartbeatStale: true,
      heartbeatAgeMs,
    }
  }

  return {
    status: storedStatus,
    heartbeatStale: false,
    heartbeatAgeMs,
  }
}

function asLead(key: string, data: Record<string, any>, ownerUserId: string | null): MarketingLead {
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
    owner_user_id: ownerUserId ?? data.owner_user_id ?? "",
    fit_score: typeof data.fit_score === "number" ? data.fit_score : null,
    ai_summary: data.ai_summary ?? "",
    discovery_reason: data.discovery_reason ?? "",
    source_post_id: data.source_post_id ?? "",
    source_permalink: data.source_permalink ?? "",
    source_title: data.source_title ?? "",
    source_excerpt: data.source_excerpt ?? "",
    discovered_at: data.discovered_at ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function asTask(key: string, data: Record<string, any>, ownerUserId: string | null): MarketingTask {
  return {
    key,
    owner_user_id: ownerUserId ?? data.owner_user_id ?? "",
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
    task_payload:
      data.task_payload && typeof data.task_payload === "object" && !Array.isArray(data.task_payload)
        ? (data.task_payload as JsonRecord)
        : undefined,
    requested_revision_note: data.requested_revision_note,
    claimed_at: data.claimed_at ?? null,
    completed_at: data.completed_at ?? null,
    error_message: data.error_message ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function asDraft(key: string, data: Record<string, any>, ownerUserId: string | null): MarketingDraft {
  return {
    key,
    owner_user_id: ownerUserId ?? data.owner_user_id ?? "",
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

function normalizeRunner(
  data: Record<string, any> | null,
  pendingQueueCount: number,
  settings: MarketingSettings
): MarketingRunnerState {
  const effectiveStatus = getEffectiveRunnerStatus(data)
  const diagnostics =
    data?.diagnostics && typeof data.diagnostics === "object" && !Array.isArray(data.diagnostics)
      ? data.diagnostics
      : undefined

  return {
    key: RUNNER_KEY,
    agent: data?.agent ?? "MARKETING",
    status: effectiveStatus.status,
    current_task_key: data?.current_task_key ?? null,
    heartbeat_at: data?.heartbeat_at ?? null,
    last_error: data?.last_error ?? null,
    pending_queue_count: pendingQueueCount,
    recent_actions: Array.isArray(data?.recent_actions) ? data.recent_actions : [],
    autoscan_enabled: settings.autoscan_enabled,
    control_requested_at: data?.control_requested_at ?? null,
    last_control_action: data?.last_control_action ?? null,
    last_control_acknowledged_at: data?.last_control_acknowledged_at ?? null,
    last_startup_attempt_at: data?.last_startup_attempt_at ?? null,
    last_startup_status: data?.last_startup_status ?? null,
    last_startup_message: data?.last_startup_message ?? null,
    model_preferences: settings.model_preferences,
    output_limits: settings.output_limits,
    diagnostics: diagnostics
      ? {
          ...diagnostics,
          openai_key_present: settings.has_openai_api_key,
          heartbeat_stale: effectiveStatus.heartbeatStale,
          heartbeat_age_ms: effectiveStatus.heartbeatAgeMs,
        }
      : {
          openai_key_present: settings.has_openai_api_key,
          heartbeat_stale: effectiveStatus.heartbeatStale,
          heartbeat_age_ms: effectiveStatus.heartbeatAgeMs,
        },
  }
}

function parseSettingsRow(data: Record<string, any> | null | undefined): MarketingSettings {
  return {
    has_openai_api_key: Boolean(data?.marketing_openai_api_key_ciphertext),
    openai_api_key_last4: data?.marketing_openai_api_key_last4 ?? null,
    openai_api_key_set_at: data?.marketing_openai_api_key_set_at ?? null,
    autoscan_enabled: data?.marketing_autoscan_enabled ?? true,
    model_preferences: {
      discovery: FIXED_DISCOVERY_MODEL,
      drafting: FIXED_DRAFTING_MODEL,
      revision: FIXED_REVISION_MODEL,
    },
    output_limits: {
      max_draft_variants: FIXED_MAX_DRAFT_VARIANTS,
      max_output_tokens: clampNumber(data?.marketing_max_output_tokens, 150, 1200, DEFAULT_MAX_OUTPUT_TOKENS),
    },
    reddit: {
      subreddits: normalizeStringArray(data?.marketing_reddit_subreddits, DEFAULT_REDDIT_SUBREDDITS),
      search_terms: normalizeStringArray(data?.marketing_reddit_search_terms, DEFAULT_REDDIT_SEARCH_TERMS),
    },
    token_usage: {
      model: FIXED_DRAFTING_MODEL,
      requests: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      last_used_at: null,
    },
  }
}

async function getCoachTokenUsage(supabase: SupabaseClient, userId: string) {
  const entry = await readEntry(supabase, "state", TOKEN_USAGE_KEY, userId)
  const data = (entry?.data as Record<string, any> | null) ?? null

  return {
    model: FIXED_DRAFTING_MODEL,
    requests: clampNumber(data?.requests, 0, Number.MAX_SAFE_INTEGER, 0),
    input_tokens: clampNumber(data?.input_tokens, 0, Number.MAX_SAFE_INTEGER, 0),
    output_tokens: clampNumber(data?.output_tokens, 0, Number.MAX_SAFE_INTEGER, 0),
    total_tokens: clampNumber(data?.total_tokens, 0, Number.MAX_SAFE_INTEGER, 0),
    last_used_at: typeof data?.last_used_at === "string" ? data.last_used_at : null,
  }
}

async function getCoachSettingsRow(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("admin_settings")
    .select(`
      marketing_openai_api_key_ciphertext,
      marketing_openai_api_key_last4,
      marketing_openai_api_key_set_at,
      marketing_budget_mode,
      marketing_model_discovery,
      marketing_model_drafting,
      marketing_model_revision,
      marketing_max_draft_variants,
      marketing_max_output_tokens,
      marketing_autoscan_enabled,
      marketing_reddit_subreddits,
      marketing_reddit_search_terms
    `)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getCoachMarketingSettings(supabase: SupabaseClient, userId: string) {
  const [row, tokenUsage] = await Promise.all([
    getCoachSettingsRow(supabase, userId),
    getCoachTokenUsage(supabase, userId),
  ])

  return {
    ...parseSettingsRow(row),
    token_usage: tokenUsage,
  }
}

export async function updateCoachMarketingSettings(
  supabase: SupabaseClient,
  userId: string,
  input: {
    autoscan_enabled?: boolean
    max_output_tokens?: number
    reddit_subreddits?: string[]
    reddit_search_terms?: string[]
  }
) {
  const existing = parseSettingsRow(await getCoachSettingsRow(supabase, userId))

  const patch = {
    user_id: userId,
    marketing_budget_mode: true,
    marketing_autoscan_enabled:
      typeof input.autoscan_enabled === "boolean" ? input.autoscan_enabled : existing.autoscan_enabled,
    marketing_model_discovery: null,
    marketing_model_drafting: null,
    marketing_model_revision: null,
    marketing_max_draft_variants: null,
    marketing_max_output_tokens: clampNumber(
      input.max_output_tokens ?? existing.output_limits.max_output_tokens,
      150,
      1200,
      DEFAULT_MAX_OUTPUT_TOKENS
    ),
    marketing_reddit_subreddits: normalizeStringArray(input.reddit_subreddits, existing.reddit.subreddits),
    marketing_reddit_search_terms: normalizeStringArray(input.reddit_search_terms, existing.reddit.search_terms),
    updated_at: nowIso(),
  }

  const { error } = await supabase.from("admin_settings").upsert(patch, { onConflict: "user_id" })
  if (error) {
    throw new Error(error.message)
  }

  return getCoachMarketingSettings(supabase, userId)
}

export async function getMarketingSnapshot(supabase: SupabaseClient, userId: string): Promise<MarketingSnapshot> {
  const settingsPromise = getCoachMarketingSettings(supabase, userId)
  const [leadKeys, stateKeys, contentKeys, runnerRaw, activity, messages, settings] = await Promise.all([
    listEntries(supabase, "leads", userId),
    listEntries(supabase, "state", userId),
    listEntries(supabase, "content", userId),
    readEntry(supabase, "state", RUNNER_KEY),
    listAudit(supabase, { limit: 30, ownerUserId: userId }),
    recentMessages(supabase, 12, undefined, userId),
    settingsPromise,
  ])

  const [leadEntries, stateEntries, contentEntries] = await Promise.all([
    Promise.all(leadKeys.keys.map((item) => readEntry(supabase, "leads", item.key, userId))),
    Promise.all(stateKeys.keys.map((item) => readEntry(supabase, "state", item.key, userId))),
    Promise.all(contentKeys.keys.map((item) => readEntry(supabase, "content", item.key, userId))),
  ])

  const leads = leadEntries
    .filter(Boolean)
    .map((entry) => asLead(entry!.key, entry!.data as Record<string, any>, (entry as any).owner_user_id ?? userId))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))

  const tasks = stateEntries
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => entry.key.startsWith(TASK_PREFIX))
    .map((entry) => asTask(entry.key, entry.data as Record<string, any>, (entry as any).owner_user_id ?? userId))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))

  const drafts = contentEntries
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => entry.key.startsWith(DRAFT_PREFIX))
    .map((entry) => asDraft(entry.key, entry.data as Record<string, any>, (entry as any).owner_user_id ?? userId))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))

  const pendingTasks = tasks.filter((task) => ["queued", "claimed", "revision_requested"].includes(task.status))
  const followUpsDue = leads.filter(
    (lead) => lead.next_follow_up_at && lead.next_follow_up_at <= nowIso() && lead.status !== "archived"
  )

  return {
    leads,
    tasks,
    drafts,
    runner: normalizeRunner((runnerRaw?.data as Record<string, any> | null) ?? null, pendingTasks.length, settings),
    settings,
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

  await writeEntry(supabase, "leads", key, payload, userId)
  await audit(supabase, {
    owner_user_id: userId,
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
  const result = await updateEntry(
    supabase,
    "leads",
    leadKey,
    {
      ...patch,
      owner_user_id: userId,
      updated_at: nowIso(),
    },
    userId
  )

  if (!result) {
    throw new Error("Lead not found")
  }

  await audit(supabase, {
    owner_user_id: userId,
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
    lead_key?: string | null
    task_type: string
    channel: string
    objective: string
    campaign_profile: string
    required_output_format?: string
    constraints?: string[]
    banned_claims?: string[]
    priority?: string
    task_payload?: JsonRecord
  }
) {
  const isStandaloneTask = input.task_type === "scan_reddit_leads"
  const leadKey = input.lead_key ?? null
  let lead: Awaited<ReturnType<typeof readEntry>> | null = null

  if (!isStandaloneTask) {
    if (!leadKey) {
      throw new Error("Lead is required for this task")
    }

    lead = await readEntry(supabase, "leads", leadKey, userId)
    if (!lead) {
      throw new Error("Lead not found")
    }
  }

  const key = makeKey(TASK_PREFIX)
  const timestamp = nowIso()
  const payload: JsonRecord = {
    owner_user_id: userId,
    lead_key: leadKey,
    task_type: input.task_type,
    status: "queued",
    priority: input.priority ?? "normal",
    channel: input.channel,
    objective: input.objective,
    campaign_profile: input.campaign_profile,
    required_output_format: input.required_output_format ?? "2-3 variants plus short rationale",
    constraints: input.constraints ?? [],
    banned_claims: input.banned_claims ?? [],
    lead_context: (lead?.data as JsonRecord | undefined) ?? null,
    task_payload: input.task_payload ?? {},
    created_at: timestamp,
    updated_at: timestamp,
  }

  await writeEntry(supabase, "state", key, payload, userId)
  await sendMessage(supabase, {
    owner_user_id: userId,
    sender: "SYSTEM",
    tag: "TASK_QUEUED",
    content: leadKey
      ? `Task ${key} queued for ${leadKey}: ${input.task_type}`
      : `Standalone task ${key} queued: ${input.task_type}`,
    type: "broadcast",
    priority: "normal",
  })
  await audit(supabase, {
    owner_user_id: userId,
    op: "marketing_task_create",
    sector: "state",
    key,
    agent: userId,
    summary: leadKey ? `Queued ${input.task_type} for ${leadKey}` : `Queued standalone ${input.task_type}`,
    meta: { channel: input.channel, campaign_profile: input.campaign_profile, standalone: isStandaloneTask },
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
  const draft = await readEntry(supabase, "content", input.draft_key, userId)
  if (!draft) {
    throw new Error("Draft not found")
  }

  const current = asDraft(draft.key, draft.data as Record<string, any>, (draft as any).owner_user_id ?? userId)
  const timestamp = nowIso()
  let nextStatus = current.status
  const patch: Record<string, any> = { owner_user_id: userId, updated_at: timestamp }

  switch (input.action) {
    case "approve":
      nextStatus = "approved"
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
        await writeEntry(
          supabase,
          "state",
          revisionTaskKey,
          {
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
          },
          userId
        )
        await audit(supabase, {
          owner_user_id: userId,
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

  const updated = await updateEntry(supabase, "content", current.key, patch, userId)
  if (!updated) {
    throw new Error("Draft not found after update")
  }

  if (input.action === "mark_sent" && current.lead_key) {
    await updateEntry(
      supabase,
      "leads",
      current.lead_key,
      {
        owner_user_id: userId,
        last_contacted_at: timestamp,
        updated_at: timestamp,
      },
      userId
    )
  }

  await audit(supabase, {
    owner_user_id: userId,
    op: "marketing_draft_transition",
    sector: "content",
    key: current.key,
    agent: userId,
    summary: `Draft ${current.key} -> ${patch.status ?? current.status}`,
    meta: { action: input.action, reviewer_note: input.reviewer_note ?? "", outcome_note: input.outcome_note ?? "" },
  })

  return updated
}

export async function controlMarketingRunner(
  supabase: SupabaseClient,
  userId: string,
  input: {
    action: "trigger_scan" | "process_queue" | "pause_autoscan" | "resume_autoscan"
  }
) {
  const timestamp = nowIso()
  const existingRunner = await readEntry(supabase, "state", RUNNER_KEY)
  const currentData = (existingRunner?.data as Record<string, any> | null) ?? {}

  if (input.action === "pause_autoscan" || input.action === "resume_autoscan") {
    await updateCoachMarketingSettings(supabase, userId, {
      autoscan_enabled: input.action === "resume_autoscan",
    })
  }

  const patch: Record<string, any> = {
    control_requested_at: timestamp,
    last_control_action: input.action,
    updated_at: timestamp,
  }

  if (input.action === "process_queue") {
    patch.run_requested_at = timestamp
  }
  if (input.action === "trigger_scan") {
    patch.manual_scan_requested_at = timestamp
  }

  if (existingRunner) {
    await updateEntry(supabase, "state", RUNNER_KEY, patch)
  } else {
    await writeEntry(supabase, "state", RUNNER_KEY, {
      agent: "MARKETING",
      status: "offline",
      current_task_key: null,
      heartbeat_at: null,
      last_error: null,
      pending_queue_count: 0,
      recent_actions: [],
      created_at: timestamp,
      ...patch,
    })
  }

  if (input.action === "trigger_scan") {
    await createMarketingTask(supabase, userId, {
      lead_key: null,
      task_type: "scan_reddit_leads",
      channel: "reddit_search",
      objective: "Scan Reddit for fitness and coaching leads using Google Sheets or spreadsheets to manage clients.",
      campaign_profile: "reddit_google_sheets",
      required_output_format: "Create qualified leads, conversation records, and outreach tasks for the best matches.",
      constraints: [
        "Focus on coaches, personal trainers, online coaches, and fitness operators.",
        "Prioritize leads mentioning Google Sheets, spreadsheets, onboarding, check-ins, client tracking, or admin workflows.",
        "Do not create duplicates if the Reddit handle already exists as a lead.",
      ],
      banned_claims: [
        "Do not promise revenue outcomes.",
        "Do not promise medical or health outcomes.",
      ],
      priority: "high",
      task_payload: {
        source: "dashboard_trigger",
      },
    })
  }

  await sendMessage(supabase, {
    owner_user_id: userId,
    sender: "DASHBOARD",
    tag: "DIRECTIVE",
    type: "targeted",
    recipients: ["MARKETING"],
    priority: "high",
    content: `Runner control requested: ${input.action}`,
    ref_id: RUNNER_KEY,
  })

  await audit(supabase, {
    owner_user_id: userId,
    op: "marketing_runner_control",
    sector: "state",
    key: RUNNER_KEY,
    agent: userId,
    summary: `Runner control: ${input.action}`,
    meta: {
      action: input.action,
      previous_status: currentData.status ?? "offline",
    },
  })

  return {
    ok: true,
    action: input.action,
    runner_key: RUNNER_KEY,
  }
}

export async function updateMarketingRunnerSettings(
  supabase: SupabaseClient,
  userId: string,
  input: {
    autoscan_enabled?: boolean
    max_output_tokens?: number
    reddit_subreddits?: string[]
    reddit_search_terms?: string[]
  }
) {
  const settings = await updateCoachMarketingSettings(supabase, userId, input)

  await sendMessage(supabase, {
    owner_user_id: userId,
    sender: "DASHBOARD",
    tag: "RUNNER_SETTINGS",
    type: "targeted",
    recipients: ["MARKETING"],
    priority: "normal",
    content: `Runner settings updated. Autoscan: ${settings.autoscan_enabled ? "on" : "off"}. Discovery model: ${settings.model_preferences.discovery}. Drafting model: ${settings.model_preferences.drafting}. Revision model: ${settings.model_preferences.revision}. Variant cap: ${settings.output_limits.max_draft_variants}. Output cap: ${settings.output_limits.max_output_tokens}.`,
    ref_id: RUNNER_KEY,
  })

  await audit(supabase, {
    owner_user_id: userId,
    op: "marketing_runner_settings_update",
    sector: "state",
    key: RUNNER_KEY,
    agent: userId,
    summary: "Updated marketing runner settings",
    meta: {
      model_preferences: settings.model_preferences,
      output_limits: settings.output_limits,
      autoscan_enabled: settings.autoscan_enabled,
    },
  })

  return {
    ok: true,
    runner_key: RUNNER_KEY,
    settings,
  }
}
