import type { Metadata } from "next"
import "./globals.css"
import { PLATFORM_NAME } from "@/lib/platform"

export const metadata: Metadata = {
  title: PLATFORM_NAME,
  description: "A coach platform built around the Google Sheets workflow you already own.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen bg-gf-black text-white">
        {children}
      </body>
    </html>
  )
}
