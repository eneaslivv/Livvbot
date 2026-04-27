export default function Loading() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r border-border bg-surface" />
      <main className="flex-1 px-8 py-6">
        <div className="max-w-5xl space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded bg-surface-sunken" />
          <div className="h-32 rounded-lg bg-surface border border-border" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-surface border border-border" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
