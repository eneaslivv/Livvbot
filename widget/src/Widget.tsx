import { useState, useRef, useEffect, useMemo } from 'react'
import { sendMessage, getOrCreateSessionId } from './api'
import type { WidgetConfig, ChatMessage, QuickAction, SourceRef } from './types'
import {
  captureAutoContext,
  subscribeToCartChanges,
  subscribeToJourney,
  subscribeToIdle,
  type CartContext,
  type AutoContext,
} from './context'
import { MessageContent } from './MessageContent'

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

// SVG icons inline (no extra HTTP requests, lighter than a font/icon lib)
const ChatIcon = () => (
  <svg className="livv-bot-launcher-icon" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

const SendIcon = () => (
  <svg className="livv-bot-input-icon" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const SourceIcon = ({ type }: { type: SourceRef['type'] }) => {
  if (type === 'recipe') {
    return (
      <svg className="livv-bot-source-pill-icon" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 2l1.5 4h9L18 2" />
        <path d="M4 8h16l-1 12H5L4 8z" />
      </svg>
    )
  }
  // faq / document icon
  return (
    <svg className="livv-bot-source-pill-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

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

  const { brand } = config
  const botName = brand?.botName ?? 'Assistant'
  const greeting = brand?.greeting ?? 'Hi! How can I help?'
  const placeholder = brand?.placeholder ?? 'Ask me anything...'

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
  }, [isOpen])

  // Scroll behavior: anchor top of assistant reply, snap to bottom on user send.
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role === 'assistant') {
      const nodes = scrollRef.current.querySelectorAll('.livv-bot-msg-row-assistant')
      const target = nodes[nodes.length - 1] as HTMLElement | undefined
      if (target) {
        const containerRect = scrollRef.current.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const delta = targetRect.top - containerRect.top - 12
        scrollRef.current.scrollBy({ top: delta, behavior: 'smooth' })
        return
      }
    }
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isLoading])

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

  // Welcome state shows only when nothing has happened yet — once the user
  // sends a message, switch to the regular chat flow.
  const showWelcome = isOpen && messages.length === 0 && !isLoading && !error
  const showPills = visibleActions.length > 0 && messages.length <= 1 && !isLoading

  return (
    <div
      className={`livv-bot livv-bot-${brand?.position === 'left' ? 'left' : 'right'}`}
      style={
        {
          '--livv-primary': brand?.primaryColor ?? '#14171c',
          '--livv-accent': brand?.accentColor ?? '#d4a017',
        } as React.CSSProperties
      }
    >
      {!isOpen && (
        <button
          className={`livv-bot-launcher ${hasPulse ? 'livv-bot-launcher-pulse' : ''}`}
          onClick={() => setIsOpen(true)}
          aria-label={`Open ${botName}`}
        >
          {brand?.mascotUrl ? (
            <img src={brand.mascotUrl} alt={botName} />
          ) : (
            <ChatIcon />
          )}
          {hasPulse && <span className="livv-bot-launcher-dot" aria-hidden />}
        </button>
      )}

      {isOpen && (
        <div className="livv-bot-window">
          <header className="livv-bot-header">
            <div className="livv-bot-identity">
              {brand?.mascotUrl && <img src={brand.mascotUrl} alt="" />}
              <div className="livv-bot-identity-text">
                <span className="livv-bot-identity-name">{botName}</span>
                <span className="livv-bot-identity-status">
                  <span className="livv-bot-status-dot" />
                  Online
                </span>
              </div>
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
              <CloseIcon />
            </button>
          </header>

          <div className="livv-bot-messages" ref={scrollRef}>
            {showWelcome && (
              <div className="livv-bot-welcome">
                <div className="livv-bot-welcome-mascot">
                  {brand?.mascotUrl ? (
                    <img src={brand.mascotUrl} alt="" />
                  ) : (
                    botName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="livv-bot-welcome-greeting">{greeting}</div>
              </div>
            )}

            {messages.map((m, i) => {
              const productSources = (m.sources ?? []).filter((s) => s.type === 'product')
              const otherSources = (m.sources ?? []).filter((s) => s.type !== 'product')
              return (
                <div
                  key={i}
                  className={`livv-bot-msg-row livv-bot-msg-row-${m.role}`}
                >
                  <div className={`livv-bot-msg livv-bot-msg-${m.role}`}>
                    <MessageContent text={m.content} />
                  </div>
                  {otherSources.length > 0 && (
                    <div className="livv-bot-sources">
                      {otherSources.slice(0, 4).map((s, j) => (
                        <span key={j} className="livv-bot-source-pill">
                          <SourceIcon type={s.type} />
                          {s.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {productSources.length > 0 && (
                    <ProductCards
                      sources={productSources}
                      urlTemplate={brand?.productUrlTemplate}
                      brandName={botName}
                    />
                  )}
                </div>
              )
            })}

            {isLoading && (
              <div className="livv-bot-typing">
                <span className="livv-bot-wave">
                  <span /> <span /> <span />
                </span>
              </div>
            )}

            {error && <div className="livv-bot-error">{error}</div>}

            {showPills && (
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
              placeholder={placeholder}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCards({
  sources,
  urlTemplate,
  brandName,
}: {
  sources: SourceRef[]
  urlTemplate?: string
  brandName: string
}) {
  // Only treat a template as usable if it includes the {handle} placeholder
  // AND is absolute. Otherwise we'd render a CTA that links to a broken page.
  const hasUsableTemplate = Boolean(
    urlTemplate && urlTemplate.includes('{handle}') && /^https?:\/\//i.test(urlTemplate)
  )

  function buildUrl(handle: string): string {
    return urlTemplate!.replace('{handle}', encodeURIComponent(handle))
  }

  return (
    <div className="livv-bot-cards">
      {sources.map((s, i) => {
        const canLink = hasUsableTemplate && Boolean(s.handle)
        const inner = (
          <>
            <div className="livv-bot-card-media">
              {s.image_url ? (
                <img src={s.image_url} alt={s.title} loading="lazy" />
              ) : (
                <span className="livv-bot-card-media-fallback">
                  {(s.title || brandName).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="livv-bot-card-body">
              <div className="livv-bot-card-title">{s.title}</div>
              {s.description && (
                <div className="livv-bot-card-desc">
                  {s.description.length > 80
                    ? s.description.slice(0, 80) + '…'
                    : s.description}
                </div>
              )}
              {canLink && <div className="livv-bot-card-cta">View product →</div>}
            </div>
          </>
        )
        if (canLink) {
          return (
            <a
              key={i}
              className="livv-bot-card"
              href={buildUrl(s.handle!)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {inner}
            </a>
          )
        }
        // Static info-card when there's no working URL pattern yet.
        return (
          <div key={i} className="livv-bot-card livv-bot-card-static">
            {inner}
          </div>
        )
      })}
    </div>
  )
}
