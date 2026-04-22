import { useState, useRef, useEffect, useMemo } from 'react'
import { sendMessage, getOrCreateSessionId } from './api'
import type { WidgetConfig, ChatMessage, QuickAction, SourceRef } from './types'
import {
  captureAutoContext,
  subscribeToCartChanges,
  subscribeToJourney,
  subscribeToIdle,
  readJourney,
  readSearchQuery,
  type CartContext,
  type AutoContext,
} from './context'

interface Props {
  config: WidgetConfig
}

function matchesCurrentPage(action: QuickAction): boolean {
  if (!action.page_match) return true
  try {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/'
    return path.includes(action.page_match)
  } catch {
    return true
  }
}

const IDLE_MS = 30_000

export function Widget({ config }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasPulse, setHasPulse] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartContext | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(getOrCreateSessionId())

  const visibleActions = useMemo(
    () => (config.quickActions ?? []).filter(matchesCurrentPage),
    [config.quickActions]
  )

  // Auto-capture subscriptions
  useEffect(() => {
    if (config.disableAutoContext) return
    const unsubJourney = subscribeToJourney()
    const unsubCart = subscribeToCartChanges((c) => setCart(c))
    const unsubIdle = subscribeToIdle(IDLE_MS, () => {
      if (!isOpen && messages.length === 0) setHasPulse(true)
    })
    return () => {
      unsubJourney()
      unsubCart()
      unsubIdle()
    }
  }, [config.disableAutoContext])

  useEffect(() => {
    if (isOpen) setHasPulse(false)
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: config.brand.greeting,
          ts: Date.now(),
        },
      ])
    }
  }, [isOpen])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendPrompt(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const ctx: AutoContext = config.disableAutoContext
        ? {
            currentPath: window.location.pathname,
            journey: undefined,
            searchQuery: undefined,
            cartContext: undefined,
          }
        : await captureAutoContext()

      const res = await sendMessage(config.apiUrl, config.tenantSlug, {
        sessionId: sessionId.current,
        message: trimmed,
        history,
        productContext: config.productContext,
        cartContext: ctx.cartContext,
        journey: ctx.journey,
        searchQuery: ctx.searchQuery,
      })

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.message, ts: Date.now(), sources: res.sources },
      ])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSend() {
    sendPrompt(input)
  }

  const { brand } = config
  const showPills = visibleActions.length > 0 && messages.length <= 1

  return (
    <div
      className="livv-bot"
      style={
        {
          '--livv-primary': brand.primaryColor,
          '--livv-accent': brand.accentColor,
        } as React.CSSProperties
      }
    >
      {!isOpen && (
        <button
          className={`livv-bot-launcher ${hasPulse ? 'livv-bot-launcher-pulse' : ''}`}
          onClick={() => setIsOpen(true)}
          aria-label={`Open ${brand.botName}`}
        >
          {brand.mascotUrl ? (
            <img src={brand.mascotUrl} alt={brand.botName} />
          ) : (
            <span>{brand.botName}</span>
          )}
          {hasPulse && (
            <span className="livv-bot-launcher-dot" aria-hidden />
          )}
        </button>
      )}

      {isOpen && (
        <div className="livv-bot-window">
          <header className="livv-bot-header">
            <div className="livv-bot-identity">
              {brand.mascotUrl && <img src={brand.mascotUrl} alt="" />}
              <strong>{brand.botName}</strong>
              {cart && cart.item_count > 0 && (
                <span className="livv-bot-cart-chip" title={`${cart.item_count} in cart`}>
                  🛒 {cart.item_count}
                </span>
              )}
            </div>
            <button
              className="livv-bot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="livv-bot-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`livv-bot-msg livv-bot-msg-${m.role}`}>{m.content}</div>
                {m.sources && m.sources.filter((s) => s.type === 'product').length > 0 && (
                  <ProductCards sources={m.sources.filter((s) => s.type === 'product')} />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="livv-bot-msg livv-bot-msg-assistant livv-bot-typing">
                <span className="livv-bot-dots">
                  <span /> <span /> <span />
                </span>
              </div>
            )}
            {error && <div className="livv-bot-error">{error}</div>}

            {showPills && !isLoading && (
              <div className="livv-bot-pills">
                {visibleActions.map((a) => (
                  <button
                    key={a.id}
                    className="livv-bot-pill"
                    onClick={() => sendPrompt(a.prompt)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="livv-bot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={brand.placeholder}
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCards({ sources }: { sources: SourceRef[] }) {
  return (
    <div className="livv-bot-cards">
      {sources.map((s, i) => (
        <a
          key={i}
          className="livv-bot-card"
          href={s.handle ? `/products/${s.handle}` : '#'}
          target="_top"
        >
          <div className="livv-bot-card-title">{s.title}</div>
          {s.description && (
            <div className="livv-bot-card-desc">{s.description.slice(0, 90)}…</div>
          )}
          <div className="livv-bot-card-cta">View product →</div>
        </a>
      ))}
    </div>
  )
}
