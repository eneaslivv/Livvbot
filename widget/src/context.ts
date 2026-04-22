// Auto-capture context from the host page: product, cart, journey, search.
// Everything is best-effort — if the site doesn't expose a feature, we just skip it silently.

export interface CartItem {
  handle?: string
  name: string
  quantity: number
  price?: number
  line_price?: number
}

export interface CartContext {
  items: CartItem[]
  item_count: number
  total_price?: number
  currency?: string
}

export interface PageVisit {
  path: string
  title?: string
  ts: number
}

export interface AutoContext {
  cartContext?: CartContext
  journey?: PageVisit[]
  searchQuery?: string
  currentPath: string
}

const JOURNEY_KEY = 'livv-bot-journey'
const MAX_JOURNEY = 5

// ----------------- Cart (Shopify) -----------------

export async function readShopifyCart(): Promise<CartContext | undefined> {
  try {
    const res = await fetch('/cart.js', { credentials: 'same-origin' })
    if (!res.ok) return undefined
    const data = await res.json()
    const items: CartItem[] = (data.items ?? []).map((i: any) => ({
      handle: i.handle,
      name: i.product_title ?? i.title ?? 'Unknown',
      quantity: i.quantity ?? 1,
      price: typeof i.price === 'number' ? i.price / 100 : undefined,
      line_price: typeof i.line_price === 'number' ? i.line_price / 100 : undefined,
    }))
    return {
      items,
      item_count: data.item_count ?? items.length,
      total_price: typeof data.total_price === 'number' ? data.total_price / 100 : undefined,
      currency: data.currency,
    }
  } catch {
    return undefined
  }
}

// Re-check cart after Shopify mutations (Shopify fires "cart:updated" on theme emits, but we don't rely on that).
export function subscribeToCartChanges(onChange: (cart: CartContext | undefined) => void) {
  if (typeof window === 'undefined') return () => {}
  let lastSignature = ''
  const tick = async () => {
    const c = await readShopifyCart()
    const sig = c ? JSON.stringify([c.item_count, c.total_price]) : 'empty'
    if (sig !== lastSignature) {
      lastSignature = sig
      onChange(c)
    }
  }
  tick()
  const id = window.setInterval(tick, 8000)
  const onFocus = () => tick()
  window.addEventListener('focus', onFocus)
  return () => {
    window.clearInterval(id)
    window.removeEventListener('focus', onFocus)
  }
}

// ----------------- Journey (SPA + classic) -----------------

export function readJourney(): PageVisit[] {
  try {
    const raw = sessionStorage.getItem(JOURNEY_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function recordVisit() {
  if (typeof window === 'undefined') return
  const existing = readJourney()
  const last = existing[existing.length - 1]
  const current: PageVisit = {
    path: window.location.pathname + window.location.search,
    title: document.title,
    ts: Date.now(),
  }
  if (last?.path === current.path) return
  const next = [...existing, current].slice(-MAX_JOURNEY)
  try {
    sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(next))
  } catch {}
}

export function subscribeToJourney() {
  if (typeof window === 'undefined') return () => {}

  recordVisit()

  const origPushState = history.pushState
  const origReplaceState = history.replaceState

  history.pushState = function (...args) {
    const r = origPushState.apply(this, args as any)
    setTimeout(recordVisit, 0)
    return r
  }
  history.replaceState = function (...args) {
    const r = origReplaceState.apply(this, args as any)
    setTimeout(recordVisit, 0)
    return r
  }

  const onPop = () => recordVisit()
  window.addEventListener('popstate', onPop)

  return () => {
    history.pushState = origPushState
    history.replaceState = origReplaceState
    window.removeEventListener('popstate', onPop)
  }
}

// ----------------- Search query -----------------

export function readSearchQuery(): string | undefined {
  try {
    const params = new URLSearchParams(window.location.search)
    const candidates = ['q', 'query', 'search', 's']
    for (const key of candidates) {
      const v = params.get(key)
      if (v && v.trim()) return v.trim()
    }
    return undefined
  } catch {
    return undefined
  }
}

// ----------------- Idle detection -----------------

export function subscribeToIdle(thresholdMs: number, onIdle: () => void) {
  if (typeof window === 'undefined') return () => {}
  let timer: number | undefined
  let fired = false

  const reset = () => {
    if (fired) return
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fired = true
      onIdle()
    }, thresholdMs)
  }

  const events = ['mousemove', 'keydown', 'scroll', 'touchstart']
  events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
  reset()

  return () => {
    if (timer) window.clearTimeout(timer)
    events.forEach((e) => window.removeEventListener(e, reset))
  }
}

// ----------------- Full snapshot -----------------

export async function captureAutoContext(): Promise<AutoContext> {
  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '/'
  const journey = readJourney()
  const searchQuery = readSearchQuery()
  const cartContext = await readShopifyCart()
  return { currentPath, journey, searchQuery, cartContext }
}
