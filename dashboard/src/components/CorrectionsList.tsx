'use client'

import { useState, useTransition } from 'react'
import { Archive, GraduationCap, Trash2, Loader2 } from 'lucide-react'
import { archiveCorrection } from '@/app/dashboard/[slug]/conversations/actions'

interface Correction {
  id: string
  user_query: string
  original_message: string | null
  corrected_message: string
  reason: string | null
  created_at: string
}

export function CorrectionsList({
  slug,
  corrections,
}: {
  slug: string
  corrections: Correction[]
}) {
  const [items, setItems] = useState(corrections)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleArchive(id: string) {
    setPendingId(id)
    startTransition(async () => {
      const res = await archiveCorrection(slug, id)
      if (res.ok) {
        setItems((prev) => prev.filter((c) => c.id !== id))
      }
      setPendingId(null)
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-ink-muted">
        No lessons yet. Open the{' '}
        <a href={`/dashboard/${slug}/conversations`} className="underline hover:text-ink">
          Conversations
        </a>{' '}
        tab and click <span className="font-medium">✏️ Improve</span> on any reply you'd like to fix.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-ink-muted">
        {items.length} active lesson{items.length === 1 ? '' : 's'}. The bot retrieves these by semantic similarity before each reply, so it'll apply them only when the user asks something close to the original question.
      </div>
      <ul className="space-y-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="border border-border rounded-md bg-surface p-3 text-xs space-y-1.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mr-1.5">
                    Q:
                  </span>
                  <span className="text-ink-soft">{c.user_query}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mr-1.5">
                    A:
                  </span>
                  <span className="text-ink whitespace-pre-wrap">{c.corrected_message}</span>
                </div>
                {c.reason && (
                  <div className="text-[11px] text-ink-muted italic">Reason: {c.reason}</div>
                )}
                <div className="text-[10px] text-ink-faint">
                  {new Date(c.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleArchive(c.id)}
                disabled={pendingId === c.id}
                title="Archive — the bot will stop using this lesson"
                className="text-ink-muted hover:text-danger hover:bg-danger-bg p-1.5 rounded transition-colors disabled:opacity-50"
              >
                {pendingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
