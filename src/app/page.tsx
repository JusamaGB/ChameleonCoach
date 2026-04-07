import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PLATFORM_NAME } from "@/lib/platform"

export const dynamic = "force-dynamic"

const features = [
  {
    title: "Meal Plans",
    description: "Build personalised weekly meal plans for each client. Templates, column fill, and instant sync to Google Sheets.",
  },
  {
    title: "Progress Tracking",
    description: "Clients log weight, measurements, and notes. You see the trend. All data lives in their own Google Sheet.",
  },
  {
    title: "Appointment Booking",
    description: "Clients request sessions, you confirm with date and time. Email notifications keep everyone in the loop.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gf-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24">
        <h1 className="text-5xl sm:text-6xl font-bold mb-4">
          <span className="text-gf-pink">{PLATFORM_NAME}</span>
        </h1>
        <p className="text-gf-muted text-xl max-w-md mb-10">
          The coaching portal built for personal trainers and nutritionists who actually use Google Sheets.
        </p>
        <Link href="/register/coach">
          <Button size="lg">Start Free 14-Day Trial</Button>
        </Link>
        <p className="text-gf-muted text-sm mt-4">
          No credit card required during trial.
        </p>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
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
      <section className="px-6 py-16 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Your data, your way</h2>
        <p className="text-gf-muted leading-relaxed">
          Every client gets their own Google Sheet in your Drive. No proprietary exports, no lock-in.
          Connect once and every update — meal plans, progress entries, profile data — syncs instantly.
          Your clients can&apos;t see each other&apos;s data. Your sheets stay yours.
        </p>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center px-6 py-16 text-center">
        <Link href="/register/coach">
          <Button size="lg">Sign up as a coach</Button>
        </Link>
        <p className="text-gf-muted text-sm mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-gf-pink hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </div>
  )
}
