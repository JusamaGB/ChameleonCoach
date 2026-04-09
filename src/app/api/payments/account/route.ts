import { NextResponse } from "next/server"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { getCoachPaymentAccount, syncCoachPaymentAccountStatus } from "@/lib/coach-payments"
import { createAdmin } from "@/lib/supabase/server"

export async function GET() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result
  const { user } = result
  const admin = createAdmin()

  const { data: account } = await getCoachPaymentAccount(admin, user.id)

  if (!account?.stripe_account_id) {
    return NextResponse.json({ account: null })
  }

  const refreshed = await syncCoachPaymentAccountStatus(admin, user.id, account.stripe_account_id)
  return NextResponse.json({ account: refreshed })
}
