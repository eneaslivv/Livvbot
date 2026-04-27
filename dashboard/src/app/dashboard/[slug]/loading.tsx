export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 rounded-lg bg-surface border border-border" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-surface border border-border" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-surface border border-border" />
    </div>
  )
}
