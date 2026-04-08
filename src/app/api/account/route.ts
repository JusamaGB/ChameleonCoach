import { NextResponse } from "next/server"
import { createAdmin, createClient } from "@/lib/supabase/server"
import { deleteClientsForCoach, findAnyClientsForCoach } from "@/lib/clients"

async function deleteClientAccount(userId: string) {
  const admin = createAdmin()

  const { error: clientDeleteError } = await admin
    .from("clients")
    .delete()
    .eq("user_id", userId)

  if (clientDeleteError) {
    throw new Error(`Failed to delete client profile: ${clientDeleteError.message}`)
  }

  const { error: roleDeleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)

  if (roleDeleteError) {
    throw new Error(`Failed to delete client role: ${roleDeleteError.message}`)
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)
  }
}

async function deleteCoachWorkspace(userId: string) {
  const admin = createAdmin()

  const { data: role, error: roleLookupError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single()

  if (roleLookupError || !role || (role.role !== "coach" && role.role !== "admin")) {
    throw new Error("Coach workspace not found")
  }

  const { error: clientsDeleteError } = await deleteClientsForCoach(admin, userId)

  if (clientsDeleteError) {
    throw new Error(`Failed to delete workspace clients: ${clientsDeleteError.message}`)
  }

  const { error: slotsDeleteError } = await admin
    .from("appointment_slots")
    .delete()
    .eq("coach_id", userId)

  if (slotsDeleteError) {
    throw new Error(`Failed to delete appointment slots: ${slotsDeleteError.message}`)
  }

  const { error: appointmentsDeleteError } = await admin
    .from("appointments")
    .delete()
    .eq("coach_id", userId)

  if (appointmentsDeleteError) {
    throw new Error(`Failed to delete appointments: ${appointmentsDeleteError.message}`)
  }

  const { error: exercisesDeleteError } = await admin
    .from("exercises")
    .delete()
    .eq("coach_id", userId)

  if (exercisesDeleteError) {
    throw new Error(`Failed to delete exercises: ${exercisesDeleteError.message}`)
  }

  const { error: settingsDeleteError } = await admin
    .from("admin_settings")
    .delete()
    .eq("user_id", userId)

  if (settingsDeleteError) {
    throw new Error(`Failed to delete workspace settings: ${settingsDeleteError.message}`)
  }

  const { error: roleDeleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)

  if (roleDeleteError) {
    throw new Error(`Failed to delete coach role: ${roleDeleteError.message}`)
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdmin()
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: settings } = await admin
    .from("admin_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: ownedClient } = await findAnyClientsForCoach(admin, user.id)

  try {
    if (role?.role === "coach" || role?.role === "admin" || settings || ownedClient) {
      await deleteCoachWorkspace(user.id)
      return NextResponse.json({ ok: true, deleted: "coach" })
    }

    await deleteClientAccount(user.id)
    return NextResponse.json({ ok: true, deleted: "client" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 500 }
    )
  }
}
