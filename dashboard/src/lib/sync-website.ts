// Sync a tenant's canonical website — crawl sitemap, extract products/FAQs,
// dedupe via content hash, embed only the changed items, persist.

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'node:crypto'

export interface SyncResult {
  ok: boolean
  error?: string
  pagesCrawled: number
  productsAdded: number
  productsUpdated: number
  productsSkipped: number
  faqsAdded: number
  faqsUpdated: number
  faqsSkipped: number
  errors: string[]
  durationMs: number
}

interface SitemapEntry {
  loc: string
}

interface ExtractedProduct {
  name: string
  description?: string
  usage_notes?: string
  handle?: string
}

interface ExtractedFaq {
  question: string
  answer: string
  category?: string
}

const MAX_URLS = 60
const MAX_CONCURRENCY = 4
const RELEVANT_PATH_PATTERNS = [
  /\/products\//i,
  /\/product\//i,
  /\/collections\/[^/]+\/products\//i,
  /\/pages\//i,
  /\/about/i,
  /\/faq/i,
  /\/shipping/i,
  /\/returns/i,
  /\/contact/i,
  /\/help/i,
]

// Exclude anything that clearly isn't useful
const IGNORE_PATH_PATTERNS = [
  /\.(jpg|jpeg|png|webp|gif|svg|pdf|zip|mp4|css|js)(\?|$)/i,
  /\/blogs?\//i, // blog posts are noise for product bots
  /\/cart/i,
  /\/account/i,
  /\/checkout/i,
  /\/search/i,
  /\/password/i,
]

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function normalizeUrl(raw: string): string {
  return raw.startsWith('http') ? raw : `https://${raw}`
}

async function fetchText(url: string, timeoutMs = 10_000): Promise<string | null> {
  const ctl = new AbortController()
  const id = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 LIVV-Bots/1.0 (+https://livvvv.com)' },
      redirect: 'follow',
      signal: ctl.signal,
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(id)
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function parseSitemapLocs(xml: string): string[] {
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) ?? []
  return matches.map((m) => decodeEntities(m.replace(/<\/?loc>/g, '').trim()))
}

function isSitemapFile(url: string): boolean {
  try {
    const path = new URL(url).pathname
    return /\.xml$/i.test(path) || /\/sitemap[^/]*$/i.test(path)
  } catch {
    return /\.xml(\?|$)/i.test(url)
  }
}

async function discoverSitemapUrls(baseUrl: string): Promise<string[]> {
  const base = new URL(normalizeUrl(baseUrl))
  const roots = [
    `${base.origin}/sitemap.xml`,
    `${base.origin}/sitemap_index.xml`,
    `${base.origin}/sitemap-products.xml`,
  ]

  // Also peek at robots.txt for Sitemap: directives
  const robots = await fetchText(`${base.origin}/robots.txt`, 5000)
  if (robots) {
    const lines = robots.split(/\r?\n/)
    for (const l of lines) {
      const m = l.match(/sitemap:\s*(\S+)/i)
      if (m) roots.push(m[1])
    }
  }

  const seen = new Set<string>()
  const queue = [...new Set(roots)]
  const urls: string[] = []

  while (queue.length > 0 && urls.length < MAX_URLS * 3) {
    const s = queue.shift()!
    if (seen.has(s)) continue
    seen.add(s)
    const xml = await fetchText(s, 8000)
    if (!xml) continue
    const locs = parseSitemapLocs(xml)
    for (const loc of locs) {
      if (isSitemapFile(loc) && !seen.has(loc)) {
        queue.push(loc)
      } else {
        urls.push(loc)
      }
    }
  }

  return Array.from(new Set(urls))
}

function filterRelevant(urls: string[]): string[] {
  const filtered = urls.filter((u) => {
    if (IGNORE_PATH_PATTERNS.some((r) => r.test(u))) return false
    return RELEVANT_PATH_PATTERNS.some((r) => r.test(u))
  })
  // Dedupe and cap
  return Array.from(new Set(filtered)).slice(0, MAX_URLS)
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}

async function embed(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!res.ok) throw new Error(`embedding failed: ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

async function extractFromPage(
  apiKey: string,
  url: string,
  text: string
): Promise<{ products: ExtractedProduct[]; faqs: ExtractedFaq[] }> {
  // Hint the URL so GPT knows the page type (product page vs FAQ page vs about)
  const isProductPath = /\/products?\//i.test(url)
  const isFaqPath = /\/faq|\/shipping|\/returns|\/help/i.test(url)

  const system = `You are extracting structured knowledge from a webpage.
Return STRICT JSON matching:
{
  "products": Array<{ "name": string, "description": string, "usage_notes"?: string, "handle"?: string }>,
  "faqs": Array<{ "question": string, "answer": string, "category"?: string }>
}
Rules:
- Include only items genuinely present in the content. Do not invent.
- If the page is a product page: extract ONE product with that name + description + usage notes.
- If the page is a FAQ/shipping/returns page: extract each Q&A pair as a faq.
- If the page is about/home: extract relevant FAQ-style facts about the company (policies, mission, contact).
- Leave the other array empty when not relevant.
- Keep descriptions concise (1-3 sentences) but informative.
- Return empty arrays { "products": [], "faqs": [] } if nothing is found.`

  const userContent =
    `URL: ${url}\n` +
    `Hint: ${isProductPath ? 'product page' : isFaqPath ? 'policy/FAQ page' : 'generic page'}\n\n` +
    text.slice(0, 12_000)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  })
  if (!res.ok) throw new Error(`openai chat ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(content)
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
    }
  } catch {
    return { products: [], faqs: [] }
  }
}

// Small semaphore for concurrent fetches
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  )
  return results
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 80)
}

export async function syncTenantWebsite(slug: string): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    ok: false,
    pagesCrawled: 0,
    productsAdded: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    faqsAdded: 0,
    faqsUpdated: 0,
    faqsSkipped: 0,
    errors: [],
    durationMs: 0,
  }

  const supabase = createClient()
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('id, slug, website_url, openai_api_key_encrypted')
    .eq('slug', slug)
    .single()

  if (tErr || !tenant) {
    result.error = 'tenant not found'
    result.durationMs = Date.now() - start
    return result
  }
  if (!tenant.website_url) {
    result.error = 'no website_url configured in settings'
    result.durationMs = Date.now() - start
    return result
  }
  if (!tenant.openai_api_key_encrypted) {
    result.error = 'no OpenAI API key configured'
    result.durationMs = Date.now() - start
    return result
  }

  const apiKey = tenant.openai_api_key_encrypted as string

  // 1. Discover sitemap URLs
  const allUrls = await discoverSitemapUrls(tenant.website_url)
  if (allUrls.length === 0) {
    result.error = 'no sitemap.xml found. Try pointing website_url at the exact homepage.'
    result.durationMs = Date.now() - start
    return result
  }

  const toCrawl = filterRelevant(allUrls)
  result.pagesCrawled = toCrawl.length

  if (toCrawl.length === 0) {
    result.error = `sitemap had ${allUrls.length} URLs but none matched product/page/faq patterns`
    result.durationMs = Date.now() - start
    return result
  }

  // 2. Fetch + extract in batches of MAX_CONCURRENCY
  type PageExtract = {
    url: string
    products: ExtractedProduct[]
    faqs: ExtractedFaq[]
  }

  const extracts: PageExtract[] = []
  await mapWithConcurrency(toCrawl, MAX_CONCURRENCY, async (url) => {
    try {
      const html = await fetchText(url, 12_000)
      if (!html) return
      const text = htmlToText(html)
      if (text.length < 120) return
      const { products, faqs } = await extractFromPage(apiKey, url, text)
      extracts.push({ url, products, faqs })
    } catch (e) {
      result.errors.push(`${url}: ${(e as Error).message}`)
    }
  })

  // 3. Dedupe + upsert with content-hash delta detection
  const allProducts = extracts.flatMap((e) =>
    e.products.map((p) => ({ ...p, _source_url: e.url }))
  )
  const allFaqs = extracts.flatMap((e) =>
    e.faqs.map((f) => ({ ...f, _source_url: e.url }))
  )

  // Dedup products by handle (fallback: slugified name)
  const productByHandle = new Map<string, (typeof allProducts)[number]>()
  for (const p of allProducts) {
    if (!p.name?.trim()) continue
    const handle = (p.handle && slugify(p.handle)) || slugify(p.name)
    if (!handle) continue
    // Keep the longer description if dupe
    const existing = productByHandle.get(handle)
    if (!existing || (p.description ?? '').length > (existing.description ?? '').length) {
      productByHandle.set(handle, { ...p, handle })
    }
  }

  // Load current hashes to decide insert vs update vs skip
  type ExistingRow = { id: string; handle?: string; question?: string; content_hash: string | null }
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, handle, content_hash')
    .eq('tenant_id', tenant.id)
  const existingByHandle = new Map<string, ExistingRow>(
    (existingProducts ?? []).map((p: any) => [p.handle as string, p as ExistingRow])
  )

  for (const [handle, p] of productByHandle) {
    const hash = sha256(`${p.name}|${p.description ?? ''}|${p.usage_notes ?? ''}`)
    const existing = existingByHandle.get(handle)
    if (existing && existing.content_hash === hash) {
      result.productsSkipped++
      // still bump last_scraped_at
      await supabase
        .from('products')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', existing.id)
      continue
    }

    try {
      const vec = await embed(
        apiKey,
        `${p.name}\n${p.description ?? ''}\n${p.usage_notes ?? ''}`
      )
      const payload = {
        tenant_id: tenant.id,
        handle,
        name: p.name.trim(),
        description: p.description ?? '',
        usage_notes: p.usage_notes ?? '',
        embedding: vec,
        content_hash: hash,
        last_scraped_at: new Date().toISOString(),
        metadata: {
          source_url: p._source_url,
          imported_at: new Date().toISOString(),
        },
      }
      if (existing) {
        await supabase.from('products').update(payload).eq('id', existing.id)
        result.productsUpdated++
      } else {
        await supabase.from('products').insert(payload)
        result.productsAdded++
      }
    } catch (e) {
      result.errors.push(`product ${handle}: ${(e as Error).message}`)
    }
  }

  // Dedup FAQs by normalized question
  const faqByKey = new Map<string, (typeof allFaqs)[number]>()
  for (const f of allFaqs) {
    if (!f.question?.trim() || !f.answer?.trim()) continue
    const key = f.question.trim().toLowerCase().slice(0, 160)
    const existing = faqByKey.get(key)
    if (!existing || f.answer.length > existing.answer.length) {
      faqByKey.set(key, f)
    }
  }

  const { data: existingFaqs } = await supabase
    .from('faqs')
    .select('id, question, content_hash')
    .eq('tenant_id', tenant.id)
  const existingFaqByQ = new Map<string, ExistingRow>(
    (existingFaqs ?? []).map((f: any) => [
      f.question.toLowerCase().slice(0, 160) as string,
      f as ExistingRow,
    ])
  )

  for (const [key, f] of faqByKey) {
    const hash = sha256(`${f.question}|${f.answer}`)
    const existing = existingFaqByQ.get(key)
    if (existing && existing.content_hash === hash) {
      result.faqsSkipped++
      await supabase
        .from('faqs')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', existing.id)
      continue
    }
    try {
      const vec = await embed(apiKey, `${f.question}\n${f.answer}`)
      const payload = {
        tenant_id: tenant.id,
        category: f.category?.trim() || 'website',
        question: f.question.trim(),
        answer: f.answer.trim(),
        embedding: vec,
        content_hash: hash,
        last_scraped_at: new Date().toISOString(),
      }
      if (existing) {
        await supabase.from('faqs').update(payload).eq('id', existing.id)
        result.faqsUpdated++
      } else {
        await supabase.from('faqs').insert(payload)
        result.faqsAdded++
      }
    } catch (e) {
      result.errors.push(`faq ${key}: ${(e as Error).message}`)
    }
  }

  // 4. Stamp the tenant
  await supabase
    .from('tenants')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', tenant.id)

  result.ok = true
  result.durationMs = Date.now() - start
  return result
}
