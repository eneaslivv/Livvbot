'use client'

import { useState, useTransition } from 'react'
import { Send, Check, RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
import {
  replyAsHuman,
  markResolved,
  reopenConversation,
} from '@/app/dashboard/[slug]/conversations/actions'

interface Props {
  slug: string
  conversationId: string
  humanStatus: 'open' | 'claimed' | 'resolved'
}

export function HumanReplyComposer({ slug, conversationId, humanStatus }: Props) {
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [justSent, setJustSent] = useState(false)

  function send() {
    if (!text.trim() || pending) return
    setError(null)
    startTransition(async () => {
      const res = await replyAsHuman(slug, { conversationId, content: text })
      if (res.ok) {
        setText('')
        setJustSent(true)
        setTimeout(() => setJustSent(false), 2000)
      } else {
        setError(res.error)
      }
    })
  }

  function resolve() {
    setError(null)
    startTransition(async () => {
      const res = await markResolved(slug, conversationId)
      if (!res.ok) setError(res.error)
    })
  }

  function reopen() {
    setError(null)
    startTransition(async () => {
      const res = await reopenConversation(slug, conversationId)
      if (!res.ok) setError(res.error)
    })
  }

  if (humanStatus === 'resolved') {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-emerald-800">
          <Check className="w-3.5 h-3.5" />
          Conversation marked resolved.
        </div>
        <button
          type="button"
          onClick={reopen}
          disabled={pending}
          className="text-[11px] text-emerald-800 hover:underline inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reopen
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Reply as human
        </div>
        <button
          type="button"
          onClick={resolve}
          disabled={pending}
          className="text-[11px] text-ink-muted hover:text-ink inline-flex items-center gap-1"
        >
          <Check className="w-3 h-3" />
          Mark resolved
        </button>
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Tu respuesta… (Cmd/Ctrl + Enter para enviar)"
          rows={2}
          className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ink resize-y bg-surface"
          disabled={pending}
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !text.trim()}
          className="bg-ink text-accent-fg px-3 py-2 rounded-md inline-flex items-center gap-1.5 text-sm disabled:opacity-40 hover:opacity-90"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>
      {humanStatus === 'claimed' && (
        <div className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          You've claimed this conversation — the bot will stop replying until you mark resolved.
        </div>
      )}
      {justSent && (
        <div className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1">
          <Check className="w-3 h-3" /> Sent. The visitor will see it on their next message or reload.
        </div>
      )}
      {error && (
        <div className="mt-1.5 inline-flex items-start gap-1 text-[11px] text-danger">
          <AlertCircle className="w-3 h-3 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
