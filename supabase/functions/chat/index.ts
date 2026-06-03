import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts'
import {
  chatCompletion,
  createEmbedding,
  ChatMessage,
} from '../_shared/openai.ts'
import {
  buildSystemPrompt,
  detectHandoff,
  ProductContext,
  CartContext,
  PageVisit,
} from '../_shared/prompts.ts'
import { checkRateLimit, hashIp } from '../_shared/rate-limit.ts'

interface ChatRequest {
  sessionId: string
  message: string
  history?: ChatMessage[]
  productContext?: ProductContext
  cartContext?: CartContext
  journey?: PageVisit[]
  searchQuery?: string
  currentPath?: string
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const tenantSlug = req.headers.get('x-tenant-slug')

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: buildCorsHeaders(origin, ['*']),
    })
  }

  try {
    if (!tenantSlug) {
      return jsonResponse({ error: 'missing X-Tenant-Slug header' }, 400, origin, ['*'])
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return jsonResponse({ error: 'tenant not found' }, 404, origin, ['*'])
    }

    if (!isOriginAllowed(origin, tenant.allowed_origins)) {
      return jsonResponse({ error: 'origin not allowed' }, 403, origin, tenant.allowed_origins)
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
               req.headers.get('cf-connecting-ip') ?? 'unknown'
    const ipHashValue = await hashIp(ip)
    const { allowed, remaining } = await checkRateLimit(supabase, tenant.id, ipHashValue)

    if (!allowed) {
      return jsonResponse(
        { error: 'rate limit exceeded', retryAfter: 600 },
        429, origin, tenant.allowed_origins
      )
    }

    const body: ChatRequest = await req.json()
    const { sessionId, message, history = [], productContext, cartContext, journey, searchQuery, currentPath } = body

    if (!sessionId || !message) {
      return jsonResponse({ error: 'missing sessionId or message' }, 400, origin, tenant.allowed_origins)
    }

    const openaiKey = tenant.openai_api_key_encrypted
    if (!openaiKey) {
      return jsonResponse({ error: 'tenant misconfigured (no openai key)' }, 500, origin, tenant.allowed_origins)
    }

    // If a human already took over this conversation in the dashboard,
    // the bot stays out of the way. We still store the visitor's message
    // so the human sees it, and return a short ack instead of calling the LLM.
    const { data: ongoing } = await supabase
      .from('conversations')
      .select('id, human_status')
      .eq('tenant_id', tenant.id)
      .eq('session_id', sessionId)
      .maybeSingle()
    if (ongoing?.human_status === 'claimed') {
      const ack = 'Thanks — a team member just got your message and will reply here shortly.'
      await logConversation(supabase, tenant.id, sessionId, productContext, message, ack, {
        handoffTriggered: true,
        handoffReason: 'human-claimed',
        tokenUsage: {},
        ipHash: ipHashValue,
      })
      return jsonResponse(
        { message: ack, handoff: true, claimed: true, remaining },
        200, origin, tenant.allowed_origins
      )
    }

    const handoff = detectHumanRequest(message, tenant.handoff_keywords)
    if (handoff.triggered) {
      const handoffReply = buildHandoffReply(tenant.fallback_email, tenant.brand_config?.botName ?? 'the team')
      await logConversation(supabase, tenant.id, sessionId, productContext, message, handoffReply, {
        handoffTriggered: true, handoffReason: handoff.reason, ipHash: ipHashValue,
      })
      return jsonResponse({ message: handoffReply, handoff: true, remaining }, 200, origin, tenant.allowed_origins)
    }

    // Embed the query (enrich it with cart + recent pages for better recall)
    const retrievalText = [
      message,
      productContext?.name ? `viewing product: ${productContext.name}` : '',
      searchQuery ? `searching: ${searchQuery}` : '',
      cartContext?.items?.length ? `in cart: ${cartContext.items.map((i) => i.name).join(', ')}` : '',
    ].filter(Boolean).join('. ')

    const queryEmbedding = await createEmbedding(openaiKey, retrievalText)

    // Detect "list / show me everything" style questions so we can pull more
    // matches into the prompt — otherwise the model only sees the top 6 sauces
    // out of 12 and confidently answers as if those are all that exist.
    const listIntent = /\b(all|every|list|which|what (kinds|types|sauces|salsas|sabores|opciones|are there))\b|todas|todos|cu[áa]les|qu[eé] (salsas|tipos|sabores|opciones)|men[uú]/i.test(message)
    const matchCount = listIntent ? 16 : 10

    const { data: knowledge, error: knowledgeError } = await supabase.rpc('match_knowledge', {
      p_tenant_id: tenant.id,
      p_query_embedding: queryEmbedding,
      p_match_count: matchCount,
      p_similarity_threshold: 0.2,
    })
    if (knowledgeError) console.error('match_knowledge error', knowledgeError)

    // Retrieve relevant past corrections (RLHF-lite). High threshold so we
    // only inject lessons that actually match the current question, otherwise
    // we'd bias the model toward unrelated past replies.
    const { data: corrections, error: correctionsError } = await supabase.rpc('match_corrections', {
      p_tenant_id: tenant.id,
      p_query_embedding: queryEmbedding,
      p_match_count: 3,
      p_similarity_threshold: 0.7,
    })
    if (correctionsError) console.error('match_corrections error', correctionsError)

    const systemPrompt = buildSystemPrompt(
      tenant.system_prompt,
      knowledge ?? [],
      { productContext, cartContext, journey, searchQuery, currentPath },
      tenant.bot_rules ?? {},
      corrections ?? [],
      tenant.vertical ?? 'ecommerce'
    )

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: message },
    ]

    // Tighter token budget for casual answers; allow more room when the
    // user explicitly asked for a list so we don't truncate the lineup.
    const completion = await chatCompletion(
      openaiKey,
      tenant.openai_model,
      messages,
      { maxTokens: listIntent ? 600 : 280 }
    )

    // Enrich sources with product details for UI cards. Cap product cards
    // to keep the chat scannable — the LLM only mentions ~2 products in
    // a casual reply anyway, but `match_knowledge` can pull more. For
    // explicit list questions we keep up to 6.
    const productLimit = listIntent ? 6 : 3
    const productSources = (knowledge ?? [])
      .filter((k: any) => k.source_type === 'product')
      .slice(0, productLimit)
    let enrichedSources: any[] = []
    if (productSources.length > 0) {
      const ids = productSources.map((p: any) => p.source_id)
      const { data: products } = await supabase
        .from('products')
        .select('id, handle, name, description, image_url, category')
        .in('id', ids)
      // Preserve the similarity order from match_knowledge.
      const byId = new Map((products ?? []).map((p: any) => [p.id, p]))
      enrichedSources = productSources
        .map((s: any) => byId.get(s.source_id))
        .filter(Boolean)
        .map((p: any) => ({
          type: 'product',
          title: p.name,
          handle: p.handle,
          category: p.category,
          description: p.description,
          image_url: p.image_url,
        }))
    }

    // Add non-product sources as plain references (capped at 3 too).
    let nonProductCount = 0
    for (const k of (knowledge ?? [])) {
      if (k.source_type !== 'product' && nonProductCount < 3) {
        enrichedSources.push({ type: k.source_type, title: k.title })
        nonProductCount++
      }
    }

    await logConversation(supabase, tenant.id, sessionId, productContext, message, completion.message, {
      handoffTriggered: false, tokenUsage: completion.usage, ipHash: ipHashValue,
    })

    return jsonResponse({
      message: completion.message,
      handoff: false,
      remaining,
      sources: enrichedSources,
    }, 200, origin, tenant.allowed_origins)
  } catch (err) {
    console.error('chat error', err)
    return jsonResponse({ error: (err as Error).message }, 500, origin, ['*'])
  }
})

function jsonResponse(body: unknown, status: number, origin: string | null, allowedOrigins: string[]) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin, allowedOrigins) },
  })
}

function buildHandoffReply(email: string | null, botName: string): string {
  const emailLine = email
    ? `Please email us at **${email}** and our team will help you out.`
    : `Please contact our support team directly.`
  return `This one is better handled by a human. ${emailLine} ${botName} will be here when you're back!`
}

// Strict-enough patterns to capture leads without trapping random noise.
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/
const PHONE_RE = /(?:\+?\d[\s().-]?){8,15}/

function extractLead(text: string): { email?: string; phone?: string } {
  const lead: { email?: string; phone?: string } = {}
  const e = text.match(EMAIL_RE)
  if (e) lead.email = e[0].toLowerCase()
  const p = text.match(PHONE_RE)
  if (p) {
    const digits = p[0].replace(/\D/g, '')
    if (digits.length >= 8 && digits.length <= 15) lead.phone = p[0].trim()
  }
  return lead
}

// Broader intent detection on top of the tenant's hand-picked keywords —
// covers the most common ways a visitor asks for a person.
const HUMAN_INTENT_RE =
  /\b(hablar|talk|speak|chat)\s+(con|to|with)\s+(una?\s+)?(persona|alguien|human|someone|agent|representative|equipo|team)\b/i
const SUPPORT_WORDS_RE =
  /\b(real person|agent|representative|customer service|atenci[oó]n al cliente|asesor|soporte humano|live chat|necesito ayuda real)\b/i

function detectHumanRequest(userMessage: string, handoffKeywords: string[]): { triggered: boolean; reason?: string } {
  const lower = userMessage.toLowerCase()
  for (const kw of handoffKeywords) {
    if (lower.includes(kw.toLowerCase())) return { triggered: true, reason: `keyword:${kw}` }
  }
  if (HUMAN_INTENT_RE.test(userMessage)) return { triggered: true, reason: 'intent:talk-to-human' }
  if (SUPPORT_WORDS_RE.test(userMessage)) return { triggered: true, reason: 'intent:support-words' }
  return { triggered: false }
}

async function logConversation(
  supabase: any, tenantId: string, sessionId: string,
  productContext: ProductContext | undefined, userMessage: string, assistantMessage: string,
  opts: { handoffTriggered: boolean; handoffReason?: string; tokenUsage?: any; ipHash: string }
) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, messages, lead_data')
    .eq('tenant_id', tenantId)
    .eq('session_id', sessionId)
    .maybeSingle()

  const newMessages = [
    { role: 'user', content: userMessage, ts: new Date().toISOString() },
    { role: 'assistant', content: assistantMessage, ts: new Date().toISOString() },
  ]

  // Merge any auto-extracted contact info from the new user message into
  // existing lead_data — preserves whatever was captured in earlier turns.
  const fresh = extractLead(userMessage)
  const existingLead = (existing?.lead_data ?? {}) as Record<string, any>
  const mergedLead = { ...existingLead }
  if (fresh.email && !mergedLead.email) {
    mergedLead.email = fresh.email
    mergedLead.captured_at = new Date().toISOString()
    mergedLead.source = 'chat-auto'
  }
  if (fresh.phone && !mergedLead.phone) {
    mergedLead.phone = fresh.phone
    if (!mergedLead.captured_at) mergedLead.captured_at = new Date().toISOString()
    if (!mergedLead.source) mergedLead.source = 'chat-auto'
  }

  if (existing) {
    await supabase.from('conversations').update({
      messages: [...existing.messages, ...newMessages],
      handoff_triggered: opts.handoffTriggered,
      handoff_reason: opts.handoffReason ?? null,
      token_usage: opts.tokenUsage ?? {},
      lead_data: mergedLead,
    }).eq('id', existing.id)
  } else {
    await supabase.from('conversations').insert({
      tenant_id: tenantId,
      session_id: sessionId,
      product_context: productContext ?? null,
      messages: newMessages,
      lead_data: mergedLead,
      handoff_triggered: opts.handoffTriggered,
      handoff_reason: opts.handoffReason ?? null,
      token_usage: opts.tokenUsage ?? {},
      user_ip_hash: opts.ipHash,
    })
  }
}
