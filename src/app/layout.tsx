import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "G-Fitness",
  description: "Your personal fitness and nutrition portal",
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
