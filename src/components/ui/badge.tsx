import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "pink"
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variant === "default" && "bg-gf-border text-gf-muted",
        variant === "success" && "bg-green-900/40 text-green-400",
        variant === "warning" && "bg-yellow-900/40 text-yellow-400",
        variant === "pink" && "bg-gf-pink/20 text-gf-pink-light"
      )}
    >
      {children}
    </span>
  )
}
