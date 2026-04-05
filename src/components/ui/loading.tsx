export function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gf-border border-t-gf-pink rounded-full animate-spin" />
        <p className="text-sm text-gf-muted">{text}</p>
      </div>
    </div>
  )
}
