export interface KnowledgeContext {
  source_type: string
  source_id?: string
  title: string
  content: string
  similarity: number
}

export interface ProductContext {
  handle?: string
  name?: string
  description?: string
}

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
  ts?: number
}

export interface UserContext {
  productContext?: ProductContext
  cartContext?: CartContext
  journey?: PageVisit[]
  searchQuery?: string
  currentPath?: string
}

export function buildSystemPrompt(
  tenantSystemPrompt: string,
  knowledge: KnowledgeContext[],
  userContext: UserContext
): string {
  const knowledgeBlock = knowledge.length
    ? knowledge.map((k, i) =>
        `[${i + 1}] (${k.source_type}) ${k.title}\n${k.content}`
      ).join('\n\n')
    : 'No relevant context found.'

  const parts: string[] = []

  if (userContext.productContext?.name) {
    parts.push(
      `## CURRENT PRODUCT\nThe user is viewing: **${userContext.productContext.name}**\n${userContext.productContext.description ?? ''}`
    )
  }

  if (userContext.cartContext && userContext.cartContext.items.length > 0) {
    const lines = userContext.cartContext.items
      .map((i) => `- ${i.quantity}× ${i.name}${i.price ? ` ($${i.price.toFixed(2)})` : ''}`)
      .join('\n')
    const total = userContext.cartContext.total_price
    parts.push(
      `## USER'S CART (${userContext.cartContext.item_count} items${
        total ? `, ${userContext.cartContext.currency ?? '$'}${total.toFixed(2)} total` : ''
      })\n${lines}`
    )
  }

  if (userContext.searchQuery) {
    parts.push(`## SEARCH\nThe user searched for: "${userContext.searchQuery}"`)
  }

  if (userContext.journey && userContext.journey.length > 1) {
    const pages = userContext.journey
      .slice(-5)
      .map((p) => `- ${p.path}${p.title ? ` (${p.title})` : ''}`)
      .join('\n')
    parts.push(`## RECENT PAGES\nPages visited in this session:\n${pages}`)
  }

  if (userContext.currentPath) {
    parts.push(`## CURRENT PAGE PATH\n${userContext.currentPath}`)
  }

  const contextBlock = parts.length ? '\n\n' + parts.join('\n\n') : ''

  return `${tenantSystemPrompt}

## KNOWLEDGE BASE (use this to answer; do not invent facts)
${knowledgeBlock}${contextBlock}

## RULES
- Answer only using the knowledge base above. If the answer is not there, say you don't know and offer to connect the user with human support.
- Keep responses under 120 words unless the user explicitly asks for detail.
- Never make up product names, prices, ingredients, or stock availability.
- If relevant products appear in the knowledge base, mention them by name so the UI can show cards.
- Consider the user's cart and recent pages — proactively suggest complementary products or recipes when useful.
- If the user asks about orders, refunds, shipping status, or personal account issues, respond briefly and tell them to email the support address provided by the handler.
- Match the tone and language of the user. If they write in Spanish, reply in Spanish.`
}

export function detectHandoff(
  userMessage: string,
  handoffKeywords: string[]
): { triggered: boolean; reason?: string } {
  const lower = userMessage.toLowerCase()
  for (const kw of handoffKeywords) {
    if (lower.includes(kw.toLowerCase())) {
      return { triggered: true, reason: `keyword_match:${kw}` }
    }
  }
  return { triggered: false }
}
