export function isMissingCoachIdColumn(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false
  }

  return error.code === "42703" || error.message?.includes("column clients.coach_id does not exist") === true
}

export async function resolveLegacyCoachId(
  supabase: { from: (table: string) => any }
) {
  const coachQuery = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["coach", "admin"])
    .limit(1)
    .maybeSingle()

  if (coachQuery.error) {
    return { data: null, error: coachQuery.error }
  }

  return {
    data: coachQuery.data?.user_id ?? null,
    error: null,
  }
}

export async function listClientsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const scopedQuery = await supabase
    .from("clients")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })

  if (!isMissingCoachIdColumn(scopedQuery.error)) {
    return scopedQuery
  }

  // Legacy single-workspace fallback before the coach_id migration exists live.
  return supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
}

export async function findAnyClientsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const scopedQuery = await supabase
    .from("clients")
    .select("id")
    .eq("coach_id", coachId)
    .limit(1)
    .maybeSingle()

  if (!isMissingCoachIdColumn(scopedQuery.error)) {
    return scopedQuery
  }

  return supabase
    .from("clients")
    .select("id")
    .limit(1)
    .maybeSingle()
}

export async function findClientByEmailForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  email: string
) {
  const scopedQuery = await supabase
    .from("clients")
    .select("id, onboarding_completed")
    .eq("email", email)
    .eq("coach_id", coachId)
    .maybeSingle()

  if (!isMissingCoachIdColumn(scopedQuery.error)) {
    return scopedQuery
  }

  return supabase
    .from("clients")
    .select("id, onboarding_completed")
    .eq("email", email)
    .maybeSingle()
}

export async function insertClientForCoach(
  supabase: { from: (table: string) => any },
  {
    coachId,
    name,
    email,
    inviteToken,
    inviteExpiresAt,
  }: {
    coachId: string
    name: string
    email: string
    inviteToken: string
    inviteExpiresAt: string
  }
) {
  const scopedInsert = await supabase.from("clients").insert({
    name,
    email,
    coach_id: coachId,
    invite_token: inviteToken,
    invite_expires_at: inviteExpiresAt,
  })

  if (!isMissingCoachIdColumn(scopedInsert.error)) {
    return scopedInsert
  }

  return supabase.from("clients").insert({
    name,
    email,
    invite_token: inviteToken,
    invite_expires_at: inviteExpiresAt,
  })
}

export async function findClientInviteByToken(
  supabase: { from: (table: string) => any },
  token: string,
  selectClause: string
) {
  const scopedQuery = await supabase
    .from("clients")
    .select(selectClause)
    .eq("invite_token", token)
    .maybeSingle()

  if (!isMissingCoachIdColumn(scopedQuery.error)) {
    return scopedQuery
  }

  const fallbackClause = selectClause
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "coach_id")
    .join(", ")

  const legacyQuery = await supabase
    .from("clients")
    .select(fallbackClause)
    .eq("invite_token", token)
    .maybeSingle()

  if (legacyQuery.error || !legacyQuery.data) {
    return legacyQuery
  }

  const legacyCoach = await resolveLegacyCoachId(supabase)
  if (legacyCoach.error) {
    return { data: null, error: legacyCoach.error }
  }

  return {
    data: {
      ...legacyQuery.data,
      coach_id: legacyCoach.data,
    },
    error: null,
  }
}

export async function deleteClientsForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const scopedDelete = await supabase
    .from("clients")
    .delete()
    .eq("coach_id", coachId)

  if (!isMissingCoachIdColumn(scopedDelete.error)) {
    return scopedDelete
  }

  // Legacy single-workspace fallback before the coach_id migration exists live.
  const legacyClientsQuery = await supabase
    .from("clients")
    .select("id")

  if (legacyClientsQuery.error) {
    return { data: null, error: legacyClientsQuery.error }
  }

  const legacyClientIds = (legacyClientsQuery.data ?? [])
    .map((client: { id: string | null }) => client.id)
    .filter((id: string | null): id is string => typeof id === "string" && id.length > 0)

  if (legacyClientIds.length === 0) {
    return { data: [], error: null }
  }

  return supabase
    .from("clients")
    .delete()
    .in("id", legacyClientIds)
}
