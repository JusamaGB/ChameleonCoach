import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PLATFORM_NAME } from "@/lib/platform"

export const dynamic = "force-dynamic"

const painPoints = [
  {
    title: "Messy coach delivery",
    description:
      "Stop juggling scattered sheets, shared links, and manual back-and-forth when clients need plans, progress, and updates.",
  },
  {
    title: "Clients see a real portal",
    description:
      "Give clients one clean place for meal plans, training, onboarding, progress, and appointments instead of exposing your backend.",
  },
  {
    title: "You keep your own system",
    description:
      "Your data stays in Google Sheets in your own Drive, so you can leave without losing your operating system or client records.",
  },
]

const steps = [
  "Connect your Google account and keep the workflow you already understand.",
  "Give each client a structured portal instead of messy sheet access and ad-hoc links.",
  "Run onboarding, plans, progress, and appointments from one coach-facing workspace.",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gf-black text-white">
      <section className="relative overflow-hidden border-b border-gf-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,45,138,0.2),transparent_45%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-14 pt-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gf-pink">
              Built for PTs, nutritionists, and wellness coaches
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-6xl">
              Keep your Google Sheets.
              <br />
              Stop making clients work around them.
            </h1>
            <p className="mb-6 max-w-2xl text-lg leading-relaxed text-gf-muted">
              {PLATFORM_NAME} gives coaches a cleaner way to deliver plans, track progress,
              handle onboarding, and manage appointments without rebuilding everything in a
              locked-down platform.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register/coach">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free 14-Day Trial
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Log In
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gf-muted">
              No credit card required. Keep your data in your own Drive from day one.
            </p>
          </div>

          <Card glow className="w-full max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-gf-pink">
              Why coaches switch
            </p>
            <ul className="space-y-4 text-sm leading-relaxed text-gf-muted">
              {painPoints.map((item) => (
                <li key={item.title}>
                  <p className="mb-1 text-base font-semibold text-white">{item.title}</p>
                  <p>{item.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 max-w-3xl">
          <h2 className="mb-3 text-3xl font-bold">What changes for the coach</h2>
          <p className="text-gf-muted">
            The goal is not to replace the workflow you already know. The goal is to remove the
            parts that feel scrappy, repetitive, and hard for clients to navigate.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step} className="h-full">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gf-pink">
                Step {index + 1}
              </p>
              <p className="text-sm leading-relaxed text-gf-muted">{step}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-gf-border bg-gf-surface/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="mb-3 text-3xl font-bold">Your data stays yours</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-gf-muted">
              Every client syncs into a coach-owned Google Sheet in your Drive. That means no
              proprietary data trap, no starting from scratch if you leave, and no pressure to
              abandon the system you already trust.
            </p>
          </div>
          <Card className="h-full">
            <p className="mb-3 text-base font-semibold text-white">Phase 1 workflow</p>
            <p className="text-sm leading-relaxed text-gf-muted">
              Invite clients, onboard them, deliver plans, track progress, and manage
              appointments from one practical coach workspace while your underlying Sheets stay
              intact.
            </p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 text-center">
        <h2 className="mb-3 text-3xl font-bold">Start with the system you already run</h2>
        <p className="mx-auto mb-6 max-w-2xl text-sm leading-relaxed text-gf-muted">
          Chameleon Coach is for coaches who are already operating from Google Sheets and want a
          more professional client experience without handing control of their business data to a
          rigid platform.
        </p>
        <Link href="/register/coach">
          <Button size="lg">Create Your Coach Workspace</Button>
        </Link>
      </section>
    </div>
  )
}
