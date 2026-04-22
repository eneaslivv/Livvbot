'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Sparkles, RefreshCw, User, Bot, AlertCircle } from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  prompt: string
}

interface Tenant {
  slug: string
  name: string
  brand_config?: {
    botName?: string
    mascotUrl?: string
    primaryColor?: string
    accentColor?: string
    greeting?: string
    placeholder?: string
  }
  quick_actions?: QuickAction[]
}

interface Msg {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export function BotPreview({
  tenant,
  apiUrl,
}: {
  tenant: Tenant
  apiUrl: string
}) {
  const bc = tenant.brand_config ?? {}
  const primary = bc.primaryColor ?? '#111110'
  const accent = bc.accentColor ?? '#d4a017'
  const sessionId = useRef('preview_' + Math.random().toString(36).slice(2, 10))
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      role: 'assistant',
      content: bc.greeting ?? 'Hi! How can I help?',
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actions = useMemo(() => tenant.quick_actions ?? [], [tenant.quick_actions])
  const showPills = actions.length > 0 && messages.length <= 1

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  async function send(prompt: string) {
    const text = prompt.trim()
    if (!text || loading) return

    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch(`${apiUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': tenant.slug,
        },
        body: JSON.stringify({
          sessionId: sessionId.current,
          message: text,
          history,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, ts: Date.now() },
      ])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setMessages([
      {
        role: 'assistant',
        content: bc.greeting ?? 'Hi! How can I help?',
        ts: Date.now(),
      },
    ])
    setError(null)
    sessionId.current = 'preview_' + Math.random().toString(36).slice(2, 10)
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-sunken/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="text-sm font-semibold">Try your bot</div>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider">
            Preview
          </span>
        </div>
        <button
          onClick={reset}
          className="text-[11px] text-ink-muted hover:text-ink inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-surface-sunken"
          type="button"
        >
          <RefreshCw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Preview chat frame styled like the real widget */}
      <div
        className="flex flex-col"
        style={{ height: 440 }}
      >
        {/* Bot header inside preview */}
        <div
          className="px-4 py-3 flex items-center gap-2.5"
          style={{ background: primary, color: accent }}
        >
          {bc.mascotUrl ? (
            <img
              src={bc.mascotUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: accent, color: primary }}
            >
              {(bc.botName ?? 'B')[0]?.toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm">{bc.botName ?? tenant.name}</span>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-sunken/40"
        >
          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <div
                key={i}
                className={`flex gap-2 msg-animate ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-ink text-accent-fg' : ''
                  }`}
                  style={
                    !isUser
                      ? { background: `${accent}20`, color: primary }
                      : undefined
                  }
                >
                  {!isUser && bc.mascotUrl ? (
                    <img
                      src={bc.mascotUrl}
                      alt=""
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : isUser ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'text-white rounded-br-md'
                      : 'bg-surface text-ink rounded-bl-md border border-border'
                  }`}
                  style={isUser ? { background: primary } : undefined}
                >
                  {m.content}
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${accent}20`, color: primary }}
              >
                <Bot className="w-3 h-3" />
              </div>
              <div className="bg-surface border border-border rounded-lg rounded-bl-md px-3 py-2 text-[13px] text-ink-muted">
                <span className="inline-flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-ink-faint animate-pulse-dot" />
                  <span className="w-1 h-1 rounded-full bg-ink-faint animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-1 rounded-full bg-ink-faint animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 text-red-900 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="flex-1 break-words">{error}</div>
            </div>
          )}

          {showPills && !loading && !error && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => send(a.prompt)}
                  className="bg-surface border border-border text-[12px] px-2.5 py-1 rounded-full hover:border-ink hover:bg-ink hover:text-white transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-surface p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder={bc.placeholder ?? 'Ask me anything...'}
            disabled={loading}
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: accent, color: primary }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
