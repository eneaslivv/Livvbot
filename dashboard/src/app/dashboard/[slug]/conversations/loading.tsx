export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 rounded-lg bg-surface border border-border" />
      ))}
    </div>
  )
}
