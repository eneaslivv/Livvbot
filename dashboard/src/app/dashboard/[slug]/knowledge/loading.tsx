export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-lg bg-surface border border-border" />
      <div className="flex gap-1 border-b border-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 rounded-md bg-surface" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-72 rounded-lg bg-surface border border-border" />
        <div className="h-72 rounded-lg bg-surface border border-border" />
      </div>
    </div>
  )
}
