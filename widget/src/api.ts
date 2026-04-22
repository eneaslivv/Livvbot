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

export function getOrCreateSessionId(): string {
  const KEY = 'livv-bot-session-id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}
