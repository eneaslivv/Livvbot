'use client'

import { useState, useTransition } from 'react'
import { Pencil, ThumbsUp, ThumbsDown, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { addCorrection, submitFeedback } from '@/app/dashboard/[slug]/conversations/actions'

interface Props {
  slug: string
  conversationId: string
  messageIndex: number
  userQuery: string
  originalMessage: string
  initialRating?: 1 | -1 | 0
}

export function MessageActions({
  slug,
  conversationId,
  messageIndex,
  userQuery,
  originalMessage,
  initialRating = 0,
}: Props) {
  const [rating, setRating] = useState<1 | -1 | 0>(initialRating)
  const [showModal, setShowModal] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function vote(value: 1 | -1) {
    setError(null)
    const next = rating === value ? 0 : value
    startTransition(async () => {
      const res = await submitFeedback(slug, {
        conversationId,
        messageIndex,
        rating: value,
      })
      if (res.ok) setRating(next)
      else setError(res.error)
    })
  }

  return (
    <>
      <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity">
        <IconBtn
          active={rating === 1}
          activeClass="bg-emerald-50 text-emerald-700 border-emerald-200"
          onClick={() => vote(1)}
          disabled={pending}
          title="Mark this reply as good"
        >
          <ThumbsUp className="w-3 h-3" />
        </IconBtn>
        <IconBtn
          active={rating === -1}
          activeClass="bg-rose-50 text-rose-700 border-rose-200"
          onClick={() => vote(-1)}
          disabled={pending}
          title="Mark this reply as bad"
        >
          <ThumbsDown className="w-3 h-3" />
        </IconBtn>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink hover:bg-surface-sunken border border-border rounded-md px-1.5 py-0.5 transition-colors"
          title="Teach the bot what it should have said"
        >
          <Pencil className="w-3 h-3" />
          Improve
        </button>
        {error && <span className="text-[10px] text-danger ml-1">{error}</span>}
      </div>

      {showModal && (
        <ImproveModal
          slug={slug}
          userQuery={userQuery}
          originalMessage={originalMessage}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            setSavedAt(Date.now())
          }}
        />
      )}

      {savedAt && (
        <div
          key={savedAt}
          className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 animate-in fade-in"
        >
          <CheckCircle2 className="w-3 h-3" />
          Lesson saved — the bot will use it next time
        </div>
      )}
    </>
  )
}

function IconBtn({
  children,
  active,
  activeClass,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; activeClass?: string }) {
  const base =
    'inline-flex items-center justify-center w-6 h-6 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const idle =
    'border-border bg-surface text-ink-muted hover:text-ink hover:border-border-strong'
  return (
    <button
      type="button"
      className={`${base} ${active ? activeClass : idle}`}
      {...rest}
    >
      {children}
    </button>
  )
}

function ImproveModal({
  slug,
  userQuery,
  originalMessage,
  onClose,
  onSaved,
}: {
  slug: string
  userQuery: string
  originalMessage: string
  onClose: () => void
  onSaved: () => void
}) {
  const [corrected, setCorrected] = useState('')
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    if (!corrected.trim()) {
      setError('Please write what the bot should have said.')
      return
    }
    startTransition(async () => {
      const res = await addCorrection(slug, {
        userQuery,
        originalMessage,
        correctedMessage: corrected,
        reason,
      })
      if (res.ok) onSaved()
      else setError(res.error)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-elevated max-w-xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-surface-sunken/40">
          <div>
            <div className="font-semibold text-sm">Improve this reply</div>
            <div className="text-[11px] text-ink-muted mt-0.5">
              Teach the bot what it should have said. It'll use this lesson for similar questions in the future.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface-sunken"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">
              User asked
            </div>
            <div className="text-sm bg-surface-sunken/60 border border-border rounded-md px-3 py-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {userQuery || <em className="text-ink-faint">(no preceding user message captured)</em>}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-1">
              Bot replied (the wrong version)
            </div>
            <div className="text-sm bg-rose-50/60 border border-rose-100 rounded-md px-3 py-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-ink-soft">
              {originalMessage}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              What should it have said? <span className="text-danger">*</span>
            </label>
            <textarea
              value={corrected}
              onChange={(e) => setCorrected(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Write the ideal reply…"
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ink resize-y"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Why was the original wrong? <span className="text-ink-faint normal-case">(optional)</span>
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. invented a price, didn't mention the promo, wrong tone…"
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs bg-danger-bg border border-danger/20 text-danger-fg rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-sunken/40 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-sm px-3.5 py-2 rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="text-sm px-3.5 py-2 rounded-md bg-ink text-accent-fg hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save lesson
          </button>
        </div>
      </div>
    </div>
  )
}
