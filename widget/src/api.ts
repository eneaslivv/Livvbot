import type { SourceRef } from './types'
import type { CartContext, PageVisit } from './context'

interface ChatRequest {
  sessionId: string
  message: string
  history?: { role: string; content: string }[]
  productContext?: any
  cartContext?: CartContext
  journey?: PageVisit[]
  searchQuery?: string
}

interface ChatResponse {
  message: string
  handoff: boolean
  remaining: number
  sources?: SourceRef[]
}

export async function sendMessage(
  apiUrl: string,
  tenantSlug: string,
  payload: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${apiUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': tenantSlug,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export interface ServerConfig {
  brand?: {
    botName?: string
    mascotUrl?: string
    primaryColor?: string
    accentColor?: string
    greeting?: string
    placeholder?: string
    position?: 'right' | 'left'
    productUrlTemplate?: string
  }
  quickActions?: { id: string; label: string; prompt: string; page_match?: string }[]
}

/**
 * Fetch the live brand config from the server. Lets the widget pick up
 * Settings changes (position, colors, greeting, quick actions) without
 * the customer having to re-paste the embed snippet.
 */
export async function fetchServerConfig(
  apiUrl: string,
  tenantSlug: string
): Promise<ServerConfig | null> {
  try {
    // No custom headers → "simple" CORS request, browser skips preflight.
    const res = await fetch(
      `${apiUrl}/functions/v1/widget-config?tenant=${encodeURIComponent(tenantSlug)}`,
      { method: 'GET' }
    )
    if (!res.ok) return null
    return (await res.json()) as ServerConfig
  } catch {
    return null
  }
}

export function getOrCreateSessionId(): string {
  const KEY = 'livv-bot-session-id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}
