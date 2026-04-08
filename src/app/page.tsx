import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PLATFORM_NAME } from "@/lib/platform"

export const dynamic = "force-dynamic"

const features = [
  {
    title: "Google Sheets, Kept Intact",
    description: "Keep the workflow you already run. Every client syncs to their own Sheet in your Drive, without locking your data away.",
  },
  {
    title: "Client Portal",
    description: "Give clients a clean portal for meal plans, progress, appointments, and onboarding while your backend stays familiar.",
  },
  {
    title: "Built For Early Coaching Ops",
    description: "Invites, onboarding, appointments, billing hooks, and progress tracking are ready for a practical Phase 1 launch.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gf-black text-white flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-10">
        <h1 className="text-5xl sm:text-6xl font-bold mb-3">
          <span className="text-gf-pink">{PLATFORM_NAME}</span>
        </h1>
        <p className="text-gf-muted text-lg max-w-2xl mb-8">
          Your Google Sheets workflow, with a real coach platform on top. Built for nutritionists, PTs, and coaches who want client-facing polish without giving up their data.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link href="/register/coach">
            <Button size="lg">Start Free 14-Day Trial</Button>
          </Link>
          <p className="text-gf-muted text-sm">
            No credit card required.{" "}
            <Link href="/login" className="text-gf-pink hover:underline">
              Already have an account?
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-10 max-w-4xl mx-auto w-full">
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title}>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gf-muted text-sm leading-relaxed">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Google Sheets callout */}
      <section className="px-6 pb-12 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-bold mb-3">Your data stays yours</h2>
        <p className="text-gf-muted text-sm leading-relaxed">
          Every client gets their own Google Sheet in your Drive. No proprietary data trap, no messy shared links, and no need to rebuild your operating system from scratch.
        </p>
      </section>
    </div>
  )
}
