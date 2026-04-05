"use client"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gf-muted"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full bg-gf-surface border border-gf-border rounded-lg px-4 py-2.5 text-white placeholder:text-gf-muted/50 transition-colors",
          "focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/30",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/30",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({
  label,
  error,
  className,
  id,
  ...props
}: TextAreaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gf-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "w-full bg-gf-surface border border-gf-border rounded-lg px-4 py-2.5 text-white placeholder:text-gf-muted/50 transition-colors resize-y min-h-[80px]",
          "focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/30",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({
  label,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gf-muted"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          "w-full bg-gf-surface border border-gf-border rounded-lg px-4 py-2.5 text-white transition-colors",
          "focus:outline-none focus:border-gf-pink focus:ring-1 focus:ring-gf-pink/30",
          className
        )}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
