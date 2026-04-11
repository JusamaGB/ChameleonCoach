export function isMissingCoachIdColumn(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false
  }

  return (
    error.code === "42703"
    || error.code === "PGRST204"
    || error.message?.includes("column clients.coach_id does not exist") === true
    || error.message?.includes("Could not find the 'coach_id' column of 'clients' in the schema cache") === true
  )
}

export function isMissingInviteMetadataColumns(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false
  }

  return (
    error.code === "42703"
    || error.code === "PGRST204"
    || error.message?.includes("invite_code") === true
    || error.message?.includes("invite_contact_type") === true
    || error.message?.includes("invite_contact_value") === true
  )
}

export function getClientInviteCode(client: {
  invite_code?: string | null
  drive_folder_url?: string | null
  invite_token?: string | null
}) {
  if (client.invite_code) {
    return client.invite_code
  }

  if (client.drive_folder_url && !client.drive_folder_url.startsWith("http")) {
    return client.drive_folder_url
  }

  return client.invite_token ? client.invite_token.slice(0, 8).toUpperCase() : null
}

export function getClientInviteContactType(client: {
  invite_contact_type?: string | null
  sheet_shared_permission_id?: string | null
}) {
  if (client.invite_contact_type === "email" || client.invite_contact_type === "phone") {
    return client.invite_contact_type
  }

  if (client.sheet_shared_permission_id === "email" || client.sheet_shared_permission_id === "phone") {
    return client.sheet_shared_permission_id
  }

  return "email"
}

export function getClientInviteContactValue(client: {
  invite_contact_value?: string | null
  sheet_shared_email?: string | null
  email?: string | null
}) {
  return client.invite_contact_value ?? client.sheet_shared_email ?? client.email ?? null
}

export async function resolveLegacyCoachId(
  supabase: { from: (table: string) => any }
) {
  const connectedCoachQuery = await supabase
    .from("admin_settings")
    .select("user_id, google_refresh_token, updated_at")
    .not("google_refresh_token", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!connectedCoachQuery.error && connectedCoachQuery.data?.user_id) {
    return {
      data: connectedCoachQuery.data.user_id,
      error: null,
    }
  }

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
    inviteCode,
    inviteContactType,
    inviteContactValue,
    inviteExpiresAt,
  }: {
    coachId: string
    name: string
    email: string
    inviteToken: string
    inviteCode: string
    inviteContactType: "email" | "phone"
    inviteContactValue: string
    inviteExpiresAt: string
  }
) {
  const scopedInsert = await supabase.from("clients").insert({
    name,
    email,
    coach_id: coachId,
    invite_token: inviteToken,
    invite_code: inviteCode,
    invite_contact_type: inviteContactType,
    invite_contact_value: inviteContactValue,
    invite_expires_at: inviteExpiresAt,
    provisioning_status: "pending",
  })

  if (!isMissingCoachIdColumn(scopedInsert.error) && !isMissingInviteMetadataColumns(scopedInsert.error)) {
    return scopedInsert
  }

  return supabase.from("clients").insert({
    name,
    email,
    coach_id: isMissingCoachIdColumn(scopedInsert.error) ? undefined : coachId,
    invite_token: inviteToken,
    drive_folder_url: inviteCode,
    sheet_shared_permission_id: inviteContactType,
    sheet_shared_email: inviteContactValue,
    invite_expires_at: inviteExpiresAt,
    provisioning_status: "pending",
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

export async function findClientInviteByCode(
  supabase: { from: (table: string) => any },
  code: string,
  selectClause: string
) {
  const preferredQuery = await supabase
    .from("clients")
    .select(selectClause)
    .eq("invite_code", code)
    .maybeSingle()

  if (!isMissingInviteMetadataColumns(preferredQuery.error)) {
    return preferredQuery
  }

  const fallbackClause = selectClause
    .split(",")
    .map((part) => part.trim())
    .filter((part) => !["invite_code", "invite_contact_type", "invite_contact_value"].includes(part))
    .join(", ")

  return supabase
    .from("clients")
    .select(fallbackClause)
    .eq("drive_folder_url", code)
    .maybeSingle()
}

export async function findPendingClientInviteForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  contactType: "email" | "phone",
  contactValue: string
) {
  const preferredQuery = await supabase
    .from("clients")
    .select("id, onboarding_completed")
    .eq("coach_id", coachId)
    .eq("invite_contact_type", contactType)
    .eq("invite_contact_value", contactValue)
    .maybeSingle()

  if (!isMissingCoachIdColumn(preferredQuery.error) && !isMissingInviteMetadataColumns(preferredQuery.error)) {
    return preferredQuery
  }

  let query = supabase
    .from("clients")
    .select("id, onboarding_completed")

  if (!isMissingCoachIdColumn(preferredQuery.error)) {
    query = query.eq("coach_id", coachId)
  }

  return query
    .eq("sheet_shared_permission_id", contactType)
    .eq("sheet_shared_email", contactValue)
    .maybeSingle()
}

export async function findClientByIdForCoach(
  supabase: { from: (table: string) => any },
  coachId: string,
  clientId: string,
  selectClause = "*"
) {
  const scopedQuery = await supabase
    .from("clients")
    .select(selectClause)
    .eq("id", clientId)
    .eq("coach_id", coachId)
    .maybeSingle()

  if (!isMissingCoachIdColumn(scopedQuery.error)) {
    return scopedQuery
  }

  return supabase
    .from("clients")
    .select(selectClause)
    .eq("id", clientId)
    .maybeSingle()
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
