"use client"

import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-gf-pink text-white hover:bg-gf-pink-dark active:scale-[0.98]",
        variant === "secondary" &&
          "bg-gf-surface text-white border border-gf-border hover:border-gf-pink/50",
        variant === "ghost" &&
          "bg-transparent text-gf-muted hover:text-white hover:bg-gf-surface",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
