function isMissingCoachIdColumn(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false
  }

  return error.code === "42703" || error.message?.includes("column clients.coach_id does not exist") === true
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
  return supabase
    .from("clients")
    .delete()
    .neq("id", "")
}
