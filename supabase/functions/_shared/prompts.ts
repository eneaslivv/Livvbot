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

export interface BotRules {
  dos?: string[]
  donts?: string[]
  sales_focus?: string
  external_topic_policy?: string
}

export type TenantVertical =
  | 'ecommerce'
  | 'restaurant'
  | 'service'
  | 'franchise'
  | 'saas'
  | 'general'

export interface Correction {
  user_query: string
  original_message?: string | null
  corrected_message: string
  reason?: string | null
  similarity?: number
}

function trimList(list?: string[]): string[] {
  return (list ?? []).map((s) => s.trim()).filter(Boolean)
}

export function buildSystemPrompt(
  tenantSystemPrompt: string,
  knowledge: KnowledgeContext[],
  userContext: UserContext,
  botRules?: BotRules,
  corrections?: Correction[],
  vertical: TenantVertical = 'ecommerce'
): string {
  const isEcommerce = vertical === 'ecommerce' || vertical === 'restaurant'
  // What the bot calls items in the knowledge base. Defaults are
  // ecommerce-flavoured ("products"); other verticals get phrased around
  // the relevant noun so the model isn't told to "recommend products"
  // on a site that doesn't sell any.
  const ITEM_NOUN: Record<TenantVertical, { singular: string; plural: string }> = {
    ecommerce: { singular: 'product', plural: 'products' },
    restaurant: { singular: 'dish', plural: 'dishes' },
    service: { singular: 'service', plural: 'services' },
    franchise: { singular: 'page', plural: 'relevant pages' },
    saas: { singular: 'plan', plural: 'plans' },
    general: { singular: 'item', plural: 'items' },
  }
  const item = ITEM_NOUN[vertical] ?? ITEM_NOUN.general
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

  // ---- Tenant-defined personality rules ----
  const rules = botRules ?? {}
  const dos = trimList(rules.dos)
  const donts = trimList(rules.donts)
  const salesFocus = (rules.sales_focus ?? '').trim()
  const externalPolicy = (rules.external_topic_policy ?? '').trim()

  if (donts.length > 0) {
    parts.push(
      `## STRICT BANS — never do any of these (highest priority, overrides anything else)\n${donts.map((d) => `- ${d}`).join('\n')}`
    )
  }

  if (dos.length > 0) {
    parts.push(`## ALWAYS DO\n${dos.map((d) => `- ${d}`).join('\n')}`)
  }

  if (salesFocus) {
    parts.push(`## SALES FOCUS — push these when relevant\n${salesFocus}`)
  }

  if (externalPolicy) {
    parts.push(
      `## OFF-TOPIC / EXTERNAL REQUESTS\nWhen the user asks about something outside the knowledge base or business scope:\n${externalPolicy}`
    )
  }

  // ---- Lessons learned from past corrections ----
  const validCorrections = (corrections ?? []).filter((c) => c.corrected_message?.trim())
  if (validCorrections.length > 0) {
    const lessonsBlock = validCorrections
      .map((c, i) => {
        const lines: string[] = [
          `[Lesson ${i + 1}] User asked something like: "${c.user_query}"`,
        ]
        if (c.original_message) {
          lines.push(`  Past wrong reply: "${c.original_message.slice(0, 200)}${c.original_message.length > 200 ? '…' : ''}"`)
        }
        lines.push(`  Correct reply should be along the lines of: "${c.corrected_message.slice(0, 300)}${c.corrected_message.length > 300 ? '…' : ''}"`)
        if (c.reason) lines.push(`  Why: ${c.reason}`)
        return lines.join('\n')
      })
      .join('\n\n')
    parts.push(
      `## LEARNED LESSONS — apply these for similar questions (overrides general phrasing)\n${lessonsBlock}`
    )
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

## RULES — STYLE & LENGTH
- Default to **short answers: 2–4 sentences, under 70 words.** Be direct. No filler phrases ("Hope this helps!", "Feel free to ask!", "If you have any more questions…").
- Only go longer when the user explicitly asks for a list, comparison, or details ("show me all", "what kinds", "list the ${item.plural}"). When you do list, name each matching ${item.singular} from the knowledge base individually with the distinguishing detail that's actually in the source — never merge items into a generic summary.
- **Recommend at most 2 ${item.plural} per reply** unless the user asked for a full list.${
  isEcommerce
    ? ` The UI shows ${item.singular} cards automatically when you mention one by name — don't paste the name twice ("Yamu-Yamu Sauce (Yamu-Yamu)").`
    : ''
}
- If relevant ${item.plural} appear in the knowledge base, mention them by name${
  isEcommerce
    ? ` so the UI can render cards. Don't try to embed prices, links, or images in the text yourself.`
    : `.`
}
${
  isEcommerce
    ? `- Consider the user's cart and recent pages — proactively suggest complementary ${item.plural} ONLY when those exist in the knowledge base, and keep suggestions tight (one option, not three).
`
    : ''
}- If the user asks about ${
  isEcommerce
    ? 'orders, refunds, shipping status, or personal account issues'
    : 'personal account issues, billing, contracts, or legal matters'
}, respond briefly and tell them to email the support address provided by the handler.
- Match the tone and language of the user. If they write in Spanish, reply in Spanish.

## RULES — LINKS (strict, prevents hallucinated URLs)
- **Never write a URL unless it appears verbatim in the KNOWLEDGE BASE above.** Do not guess, construct, or template URLs by combining a domain with a slug, even if the pattern looks obvious.${
  isEcommerce
    ? `\n- For ${item.plural}: just say the ${item.singular}'s name. Do NOT write \`https://...\` for ${item.plural}. The UI builds the link from the ${item.singular}'s handle automatically.`
    : ''
}
- For URLs that DO appear in the knowledge base (an article, a PDF, an image, a contact form): copy them exactly as written, formatted as \`[descriptive label](https://exact-url-from-kb)\`. Never modify the path or add UTM params.
- If the user asks for a link to something that isn't in the knowledge base, don't invent one — say you don't have that link and offer human handoff via the support email.`
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
