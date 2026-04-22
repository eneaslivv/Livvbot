import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders } from '../_shared/cors.ts'
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

    if (origin && !tenant.allowed_origins.some((o: string) =>
      origin === o || origin.endsWith(`.${o.replace(/^https?:\/\//, '')}`)
    )) {
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

    const handoff = detectHandoff(message, tenant.handoff_keywords)
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

    const { data: knowledge, error: knowledgeError } = await supabase.rpc('match_knowledge', {
      p_tenant_id: tenant.id,
      p_query_embedding: queryEmbedding,
      p_match_count: 6,
      p_similarity_threshold: 0.25,
    })
    if (knowledgeError) console.error('match_knowledge error', knowledgeError)

    const systemPrompt = buildSystemPrompt(
      tenant.system_prompt,
      knowledge ?? [],
      { productContext, cartContext, journey, searchQuery, currentPath }
    )

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: message },
    ]

    const completion = await chatCompletion(openaiKey, tenant.openai_model, messages)

    // Enrich sources with product details for UI cards
    const productSources = (knowledge ?? []).filter((k: any) => k.source_type === 'product')
    let enrichedSources: any[] = []
    if (productSources.length > 0) {
      const ids = productSources.map((p: any) => p.source_id)
      const { data: products } = await supabase
        .from('products')
        .select('id, handle, name, description')
        .in('id', ids)
      enrichedSources = (products ?? []).map((p: any) => ({
        type: 'product',
        title: p.name,
        handle: p.handle,
        description: p.description,
      }))
    }

    // Add non-product sources as plain references
    for (const k of (knowledge ?? [])) {
      if (k.source_type !== 'product') {
        enrichedSources.push({ type: k.source_type, title: k.title })
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

async function logConversation(
  supabase: any, tenantId: string, sessionId: string,
  productContext: ProductContext | undefined, userMessage: string, assistantMessage: string,
  opts: { handoffTriggered: boolean; handoffReason?: string; tokenUsage?: any; ipHash: string }
) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, messages')
    .eq('tenant_id', tenantId)
    .eq('session_id', sessionId)
    .maybeSingle()

  const newMessages = [
    { role: 'user', content: userMessage, ts: new Date().toISOString() },
    { role: 'assistant', content: assistantMessage, ts: new Date().toISOString() },
  ]

  if (existing) {
    await supabase.from('conversations').update({
      messages: [...existing.messages, ...newMessages],
      handoff_triggered: opts.handoffTriggered,
      handoff_reason: opts.handoffReason ?? null,
      token_usage: opts.tokenUsage ?? {},
    }).eq('id', existing.id)
  } else {
    await supabase.from('conversations').insert({
      tenant_id: tenantId,
      session_id: sessionId,
      product_context: productContext ?? null,
      messages: newMessages,
      handoff_triggered: opts.handoffTriggered,
      handoff_reason: opts.handoffReason ?? null,
      token_usage: opts.tokenUsage ?? {},
      user_ip_hash: opts.ipHash,
    })
  }
}
