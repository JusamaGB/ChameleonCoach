import { createClient } from "@/lib/supabase/server"

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const adminEmails = ["kris.deane93@gmail.com"]
  return !!(user?.email && adminEmails.includes(user.email.toLowerCase()))
}
