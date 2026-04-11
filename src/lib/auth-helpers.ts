import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function verifyCoach(): Promise<
  { user: User; supabase: SupabaseClient } | NextResponse
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const effectiveRole = role?.role ?? user.app_metadata?.role

  if (effectiveRole !== 'coach' && effectiveRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, supabase }
}

export function isCoachResult(
  result: { user: User; supabase: SupabaseClient } | NextResponse
): result is { user: User; supabase: SupabaseClient } {
  return 'user' in result
}
