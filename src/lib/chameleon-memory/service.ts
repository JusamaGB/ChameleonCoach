import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ALERT_TAGS,
  CHAMELEON_AGENT_ID,
  CHAMELEON_AGENT_NAME,
  CHAMELEON_LAUNCH_DATE,
  CHAMELEON_MEMORY_SECTORS,
  isValidChameleonSector,
  type ChameleonMemorySector,
} from "@/lib/chameleon-memory/config"

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

type MemoryRow = {
  sector: string
  key: string
  data: JsonValue
  search_text: string
  created_at: string
  updated_at: string
}

type MessageRow = {
  id: string
  sender: string
  msg_type: string
  tag: string
  channel: string
  recipients: string[] | null
  priority: string
  content: string
  ref_id: string | null
  created_at: string
}

export type MessageSendInput = {
  sender: string
  tag?: string
  type?: string
  recipients?: string[]
  priority?: string
  content: string
  ref_id?: string | null
}

export function assertSector(sector: string): asserts sector is ChameleonMemorySector {
  if (!isValidChameleonSector(sector)) {
    throw new Error(`Unknown sector '${sector}'`)
  }
}

export function nowIso() {
  return new Date().toISOString()
}

function buildSearchText(sector: string, key: string, data: JsonValue) {
  return `${sector} ${key} ${JSON.stringify(data ?? {})}`.toLowerCase()
}

function formatMemoryRow(row: MemoryRow) {
  return {
    sector: row.sector,
    key: row.key,
    data: row.data,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function formatMessageRow(row: MessageRow) {
  return {
    key: row.id,
    created_at: row.created_at,
    data: {
      sender: row.sender,
      type: row.msg_type,
      tag: row.tag,
      channel: row.channel,
      recipients: row.recipients ?? [],
      priority: row.priority,
      content: row.content,
      ref_id: row.ref_id,
      created_at: row.created_at,
    },
  }
}

export async function audit(
  supabase: SupabaseClient,
  {
    op,
    sector,
    key,
    agent,
    summary,
    meta,
  }: {
    op: string
    sector?: string | null
    key?: string | null
    agent?: string | null
    summary?: string
    meta?: Record<string, JsonValue>
  }
) {
  const { error } = await supabase.from("chameleon_audit").insert({
    op,
    sector: sector ?? null,
    key: key ?? null,
    agent: agent ?? null,
    summary: summary ?? "",
    meta: meta ?? {},
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function listSectors(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("chameleon_memory_entries").select("sector")

  if (error) {
    throw new Error(error.message)
  }

  const active = Array.from(new Set((data ?? []).map((row) => row.sector))).sort()

  return {
    sectors: [...CHAMELEON_MEMORY_SECTORS].sort(),
    active,
  }
}

export async function listEntries(supabase: SupabaseClient, sector: ChameleonMemorySector) {
  if (sector === "messages") {
    const { data, error } = await supabase
      .from("chameleon_messages")
      .select("id, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return {
      sector,
      keys: (data ?? []).map((row) => ({ key: row.id, updated_at: row.created_at })),
      count: data?.length ?? 0,
    }
  }

  if (sector === "inbox") {
    const { data, error } = await supabase
      .from("chameleon_inbox")
      .select("id, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return {
      sector,
      keys: (data ?? []).map((row) => ({ key: row.id, updated_at: row.created_at })),
      count: data?.length ?? 0,
    }
  }

  const { data, error } = await supabase
    .from("chameleon_memory_entries")
    .select("key, updated_at")
    .eq("sector", sector)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return {
    sector,
    keys: (data ?? []).map((row) => ({ key: row.key, updated_at: row.updated_at })),
    count: data?.length ?? 0,
  }
}

export async function readEntry(
  supabase: SupabaseClient,
  sector: ChameleonMemorySector,
  key: string
) {
  if (sector === "messages") {
    const { data, error } = await supabase
      .from("chameleon_messages")
      .select("*")
      .eq("id", key)
      .maybeSingle<MessageRow>()

    if (error) {
      throw new Error(error.message)
    }

    return data ? formatMessageRow(data) : null
  }

  if (sector === "inbox") {
    const { data, error } = await supabase
      .from("chameleon_inbox")
      .select("*")
      .eq("id", key)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data
      ? {
          sector,
          key: data.id,
          data: {
            sender: data.sender,
            recipient: data.recipient,
            content: data.content,
            priority: data.priority,
            status: data.status,
            response: data.response,
            responded_at: data.responded_at,
            created_at: data.created_at,
          },
          created_at: data.created_at,
          updated_at: data.responded_at ?? data.created_at,
        }
      : null
  }

  const { data, error } = await supabase
    .from("chameleon_memory_entries")
    .select("*")
    .eq("sector", sector)
    .eq("key", key)
    .maybeSingle<MemoryRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data ? formatMemoryRow(data) : null
}

export async function writeEntry(
  supabase: SupabaseClient,
  sector: ChameleonMemorySector,
  key: string,
  data: JsonValue
) {
  if (sector === "messages" || sector === "inbox") {
    throw new Error(`Writes to '${sector}' must use dedicated endpoints`)
  }

  const timestamp = nowIso()
  const payload = {
    sector,
    key,
    data,
    search_text: buildSearchText(sector, key, data),
    updated_at: timestamp,
  }

  const { error } = await supabase.from("chameleon_memory_entries").upsert(payload)

  if (error) {
    throw new Error(error.message)
  }

  return {
    ok: true,
    sector,
    key,
    updated_at: timestamp,
  }
}

export async function updateEntry(
  supabase: SupabaseClient,
  sector: ChameleonMemorySector,
  key: string,
  patch: Record<string, JsonValue>
) {
  if (sector === "messages" || sector === "inbox") {
    throw new Error(`Updates to '${sector}' must use dedicated endpoints`)
  }

  const existing = await readEntry(supabase, sector, key)
  if (!existing) {
    return null
  }

  const merged = {
    ...(typeof existing.data === "object" && !Array.isArray(existing.data) && existing.data ? existing.data : {}),
    ...patch,
  }

  const result = await writeEntry(supabase, sector, key, merged)

  return {
    ...result,
    data: merged,
  }
}

export async function deleteEntry(
  supabase: SupabaseClient,
  sector: ChameleonMemorySector,
  key: string
) {
  if (sector === "messages") {
    const { error, count } = await supabase
      .from("chameleon_messages")
      .delete({ count: "exact" })
      .eq("id", key)

    if (error) {
      throw new Error(error.message)
    }

    return Boolean(count)
  }

  if (sector === "inbox") {
    const { error, count } = await supabase
      .from("chameleon_inbox")
      .delete({ count: "exact" })
      .eq("id", key)

    if (error) {
      throw new Error(error.message)
    }

    return Boolean(count)
  }

  const { error, count } = await supabase
    .from("chameleon_memory_entries")
    .delete({ count: "exact" })
    .eq("sector", sector)
    .eq("key", key)

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(count)
}

export async function searchEntries(
  supabase: SupabaseClient,
  sector: ChameleonMemorySector,
  query: string
) {
  if (sector === "messages") {
    const { data, error } = await supabase
      .from("chameleon_messages")
      .select("*")
      .or(`content.ilike.%${query}%,tag.ilike.%${query}%,sender.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      throw new Error(error.message)
    }

    return {
      sector,
      query,
      results: (data ?? []).map((row) => formatMessageRow(row as MessageRow)),
      count: data?.length ?? 0,
    }
  }

  const { data, error } = await supabase
    .from("chameleon_memory_entries")
    .select("*")
    .eq("sector", sector)
    .ilike("search_text", `%${query.toLowerCase()}%`)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(error.message)
  }

  return {
    sector,
    query,
    results: (data ?? []).map((row) => formatMemoryRow(row as MemoryRow)),
    count: data?.length ?? 0,
  }
}

export async function listAudit(
  supabase: SupabaseClient,
  {
    limit,
    sector,
    op,
    agent,
    since,
  }: {
    limit: number
    sector?: string | null
    op?: string | null
    agent?: string | null
    since?: string | null
  }
) {
  let query = supabase
    .from("chameleon_audit")
    .select("*")
    .order("ts", { ascending: false })
    .limit(limit)

  if (sector) {
    query = query.eq("sector", sector)
  }
  if (op) {
    query = query.eq("op", op)
  }
  if (agent) {
    query = query.eq("agent", agent)
  }
  if (since) {
    query = query.gte("ts", since)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return {
    audit: data ?? [],
    count: data?.length ?? 0,
  }
}

export async function sendMessage(supabase: SupabaseClient, input: MessageSendInput) {
  const id = `msg_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const created_at = nowIso()
  const tag = input.tag ?? "GENERAL"
  const channel = ALERT_TAGS.has(tag) ? "alerts" : "logs"

  const { error } = await supabase.from("chameleon_messages").insert({
    id,
    sender: input.sender,
    msg_type: input.type ?? "broadcast",
    tag,
    channel,
    recipients: (input.recipients ?? []).map((recipient) => recipient.toUpperCase()),
    priority: input.priority ?? "normal",
    content: input.content,
    ref_id: input.ref_id ?? null,
    created_at,
  })

  if (error) {
    throw new Error(error.message)
  }

  return {
    ok: true,
    key: id,
    created_at,
  }
}

export async function recentMessages(supabase: SupabaseClient, count: number, tag?: string | null) {
  let query = supabase
    .from("chameleon_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(count)

  if (tag) {
    query = query.eq("tag", tag)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return {
    messages: (data ?? []).map((row) => formatMessageRow(row as MessageRow)),
    count: data?.length ?? 0,
  }
}

export async function pollMessages(
  supabase: SupabaseClient,
  {
    agent,
    channel,
    since,
    useCursor,
    limit,
  }: {
    agent: string
    channel?: string | null
    since?: string | null
    useCursor?: boolean
    limit: number
  }
) {
  let cursorTs = since ?? null

  if (useCursor && !cursorTs) {
    const { data: cursorRow, error: cursorError } = await supabase
      .from("chameleon_read_cursors")
      .select("cursor_ts")
      .eq("agent", agent.toUpperCase())
      .maybeSingle()

    if (cursorError) {
      throw new Error(cursorError.message)
    }

    cursorTs = cursorRow?.cursor_ts ?? null
  }

  let query = supabase
    .from("chameleon_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (channel) {
    query = query.eq("channel", channel)
  }

  if (cursorTs) {
    query = query.gt("created_at", cursorTs)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const normalizedAgent = agent.toUpperCase()
  const filtered = (data ?? []).filter((row) => {
    const message = row as MessageRow
    if (message.msg_type !== "targeted") {
      return true
    }
    return (message.recipients ?? []).includes(normalizedAgent)
  })

  return {
    messages: filtered.map((row) => formatMessageRow(row as MessageRow)),
    count: filtered.length,
    has_more: (data?.length ?? 0) === limit,
  }
}

export async function advanceCursor(
  supabase: SupabaseClient,
  {
    agent,
    cursorTs,
  }: {
    agent: string
    cursorTs?: string | null
  }
) {
  const resolvedCursorTs = cursorTs ?? nowIso()
  const updated_at = nowIso()

  const { error } = await supabase.from("chameleon_read_cursors").upsert({
    agent: agent.toUpperCase(),
    cursor_ts: resolvedCursorTs,
    updated_at,
  })

  if (error) {
    throw new Error(error.message)
  }

  return {
    ok: true,
    agent: agent.toUpperCase(),
    cursor_ts: resolvedCursorTs,
  }
}

export function buildClockPayload() {
  const now = new Date()
  const launch = new Date(`${CHAMELEON_LAUNCH_DATE}T00:00:00Z`)
  const dayNumber = Math.floor((now.getTime() - launch.getTime()) / 86400000) + 1

  return {
    datetime: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    time: now.toISOString().slice(11, 16),
    timezone: "UTC",
    launch_date: CHAMELEON_LAUNCH_DATE,
    day_number: dayNumber > 0 ? dayNumber : 1,
    team_roster: [
      {
        name: CHAMELEON_AGENT_NAME,
        id: CHAMELEON_AGENT_ID,
        role: "Marketing automation",
        type: "single-agent",
      },
    ],
    team_count: 1,
  }
}
