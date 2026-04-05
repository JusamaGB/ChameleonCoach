import { cn } from "@/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={cn(
        "bg-gf-surface border border-gf-border rounded-xl p-6",
        glow && "border-gf-pink/30 shadow-[0_0_30px_rgba(255,45,138,0.08)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-white", className)}>
      {children}
    </h3>
  )
}
