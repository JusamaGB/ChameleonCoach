import { MarketingConsole } from "@/components/admin/marketing-console"
import { verifyCoach, isCoachResult } from "@/lib/auth-helpers"
import { createAdmin } from "@/lib/supabase/server"
import { getMarketingSnapshot } from "@/lib/chameleon-marketing"

export const dynamic = "force-dynamic"

export default async function MarketingPage() {
  const result = await verifyCoach()
  if (!isCoachResult(result)) return result

  const { user } = result
  const admin = createAdmin()
  const snapshot = await getMarketingSnapshot(admin, user.id)

  return (
    <div className="max-w-7xl mx-auto">
      <MarketingConsole initialSnapshot={snapshot} />
    </div>
  )
}
