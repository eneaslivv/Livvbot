export default function Loading() {
  return (
    <div className="flex gap-8 animate-pulse">
      <div className="w-48 shrink-0 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 rounded-md bg-surface border border-border" />
        ))}
      </div>
      <div className="flex-1 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-surface border border-border" />
        ))}
      </div>
    </div>
  )
}
