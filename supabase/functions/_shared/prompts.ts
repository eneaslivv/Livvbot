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

## RULES — GROUNDING (highest priority)
- Use ONLY the facts present in the KNOWLEDGE BASE above. Treat anything outside it as unknown.
- Never invent, infer, or fill in missing details. This applies to product names, prices, ingredients, allergens, heat level, sizes, stock, hours, locations, policies, and shipping times.
- If the knowledge base partially answers the question (e.g. it lists a sauce by name but not its ingredients), say what you DO know and explicitly say the rest isn't in your information — then offer to connect the user with a human. Example: "Tenemos la salsa X, pero no tengo los ingredientes exactos acá. Te puedo conectar con el equipo si querés el detalle."
- If the knowledge base says nothing about the topic, do NOT guess from general knowledge. Reply that you don't have that info and offer human handoff.
- If two knowledge entries seem to contradict each other, say so plainly instead of picking one.
- Do not paraphrase a fact in a way that adds new claims. If the source says "spicy", don't upgrade it to "very spicy" or add a Scoville number.

## RULES — STYLE
- Default to concise answers (~120 words). BUT when the user asks for a list, options, "which / what kinds / all the sauces" or similar, list every matching item from the knowledge base individually — name each one and include only the distinguishing detail that's actually in the source. Do not collapse multiple items into a generic summary.
- When several knowledge entries describe distinct items in the same category (e.g. multiple sauces, dishes, drinks), treat each entry as its own item — never claim they're "the same" or merge their descriptions.
- If relevant products appear in the knowledge base, mention them by name so the UI can show cards.
- Consider the user's cart and recent pages — proactively suggest complementary products or recipes ONLY when those products exist in the knowledge base.
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
