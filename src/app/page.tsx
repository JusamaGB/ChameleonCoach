import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-gf-pink">G</span>-Fitness
        </h1>
        <p className="text-gf-muted text-lg mb-10">
          Your personalised fitness and nutrition portal
        </p>
        <Link href="/login">
          <Button size="lg">Log In</Button>
        </Link>
      </div>
    </div>
  )
}
