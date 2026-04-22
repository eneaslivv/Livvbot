import { getTenantBySlug } from '@/lib/tenant'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import {
  Package,
  HelpCircle,
  UtensilsCrossed,
  Plus,
  Trash2,
  AlertTriangle,
  Globe,
  Download,
  Sparkles,
  FileText,
} from 'lucide-react'
import { Card, Field, TextArea, Button, Alert, EmptyState, Badge } from '@/components/ui'
import { EditableKnowledgeList } from '@/components/EditableKnowledgeList'
import { DocumentUpload } from '@/components/DocumentUpload'

const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW_MODE === '1'

async function embedText(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!res.ok) throw new Error(`embedding failed: ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

async function addItem(
  slug: string,
  kind: 'product' | 'faq' | 'recipe',
  formData: FormData
) {
  'use server'
  const supabase = createClient()
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return

  // In preview mode we skip the real embedding call and just redirect
  const apiKey = tenant.openai_api_key_encrypted
  if (!apiKey && !PREVIEW) {
    redirect(`/dashboard/${slug}/knowledge?error=no_api_key`)
  }

  try {
    if (kind === 'product') {
      const name = String(formData.get('name') ?? '')
      if (!name) return
      const description = String(formData.get('description') ?? '')
      const usage = String(formData.get('usage_notes') ?? '')
      const embedding = PREVIEW ? null : await embedText(apiKey!, `${name}\n${description}\n${usage}`)
      await supabase.from('products').insert({
        tenant_id: tenant.id,
        name,
        handle: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description,
        usage_notes: usage,
        embedding,
      })
    } else if (kind === 'faq') {
      const question = String(formData.get('question') ?? '')
      const answer = String(formData.get('answer') ?? '')
      if (!question || !answer) return
      const category = String(formData.get('category') ?? '')
      const embedding = PREVIEW ? null : await embedText(apiKey!, `${question}\n${answer}`)
      await supabase.from('faqs').insert({
        tenant_id: tenant.id,
        category,
        question,
        answer,
        embedding,
      })
    } else if (kind === 'recipe') {
      const title = String(formData.get('title') ?? '')
      if (!title) return
      const description = String(formData.get('description') ?? '')
      const ingredients = String(formData.get('ingredients') ?? '')
      const steps = String(formData.get('steps') ?? '')
      const embedding = PREVIEW
        ? null
        : await embedText(apiKey!, `${title}\n${description}\n${ingredients}\n${steps}`)
      await supabase.from('recipes').insert({
        tenant_id: tenant.id,
        title,
        description,
        ingredients,
        steps,
        embedding,
      })
    }
  } catch (err) {
    console.error(err)
    redirect(
      `/dashboard/${slug}/knowledge?error=${encodeURIComponent((err as Error).message)}`
    )
  }

  revalidatePath(`/dashboard/${slug}/knowledge`)
  redirect(`/dashboard/${slug}/knowledge?tab=${kind}s&added=1`)
}

async function deleteItem(slug: string, table: string, id: string) {
  'use server'
  const supabase = createClient()
  await supabase.from(table).delete().eq('id', id)
  revalidatePath(`/dashboard/${slug}/knowledge`)
}

async function updateItem(
  slug: string,
  kind: 'product' | 'faq' | 'recipe',
  id: string,
  formData: FormData
) {
  'use server'
  const supabase = createClient()
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return

  const apiKey = tenant.openai_api_key_encrypted

  try {
    if (kind === 'product') {
      const name = String(formData.get('name') ?? '').trim()
      if (!name) return
      const description = String(formData.get('description') ?? '')
      const usage = String(formData.get('usage_notes') ?? '')
      const text = `${name}\n${description}\n${usage}`
      const embedding =
        !PREVIEW && apiKey ? await embedText(apiKey, text) : undefined
      const payload: Record<string, any> = {
        name,
        handle: name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 80),
        description,
        usage_notes: usage,
      }
      if (embedding) payload.embedding = embedding
      await supabase.from('products').update(payload).eq('id', id)
    } else if (kind === 'faq') {
      const question = String(formData.get('question') ?? '').trim()
      const answer = String(formData.get('answer') ?? '').trim()
      if (!question || !answer) return
      const category = String(formData.get('category') ?? '')
      const embedding =
        !PREVIEW && apiKey
          ? await embedText(apiKey, `${question}\n${answer}`)
          : undefined
      const payload: Record<string, any> = { question, answer, category }
      if (embedding) payload.embedding = embedding
      await supabase.from('faqs').update(payload).eq('id', id)
    } else if (kind === 'recipe') {
      const title = String(formData.get('title') ?? '').trim()
      if (!title) return
      const description = String(formData.get('description') ?? '')
      const ingredients = String(formData.get('ingredients') ?? '')
      const steps = String(formData.get('steps') ?? '')
      const embedding =
        !PREVIEW && apiKey
          ? await embedText(apiKey, `${title}\n${description}\n${ingredients}\n${steps}`)
          : undefined
      const payload: Record<string, any> = { title, description, ingredients, steps }
      if (embedding) payload.embedding = embedding
      await supabase.from('recipes').update(payload).eq('id', id)
    }
  } catch (err) {
    console.error('updateItem failed', err)
    redirect(
      `/dashboard/${slug}/knowledge?error=${encodeURIComponent((err as Error).message)}`
    )
  }

  revalidatePath(`/dashboard/${slug}/knowledge`)
  redirect(`/dashboard/${slug}/knowledge?tab=${kind}s&edited=1`)
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

interface ExtractedKnowledge {
  products: Array<{ name: string; description?: string; usage_notes?: string }>
  faqs: Array<{ question: string; answer: string; category?: string }>
}

async function extractWithOpenAI(apiKey: string, text: string): Promise<ExtractedKnowledge> {
  const system = `You extract structured knowledge from a webpage so an AI chatbot can answer customer questions.
Return STRICT JSON only, matching this TypeScript shape:
{
  "products": Array<{ "name": string, "description": string, "usage_notes"?: string }>,
  "faqs": Array<{ "question": string, "answer": string, "category"?: string }>
}
Rules:
- Only include items genuinely present in the content. Do not invent.
- "products" = physical or digital items the business sells. Skip generic site content.
- "faqs" = policies, shipping, returns, allergens, storage, about the brand, etc.
- Keep descriptions concise (1-3 sentences) but informative.
- Return empty arrays if nothing clear is found.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`)
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

async function importFromUrl(slug: string, formData: FormData) {
  'use server'
  const rawUrl = String(formData.get('url') ?? '').trim()
  if (!rawUrl) return

  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`

  const tenant = await getTenantBySlug(slug)
  if (!tenant) return

  if (PREVIEW) {
    redirect(
      `/dashboard/${slug}/knowledge?importNote=preview&url=${encodeURIComponent(url)}`
    )
  }

  const apiKey = tenant.openai_api_key_encrypted
  if (!apiKey) {
    redirect(`/dashboard/${slug}/knowledge?error=no_api_key`)
  }

  try {
    // 1. Fetch page
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 LIVV-Bots/1.0 (+https://livvvv.com)' },
      redirect: 'follow',
    })
    if (!pageRes.ok) {
      throw new Error(`Could not fetch page (${pageRes.status})`)
    }
    const html = await pageRes.text()
    const text = htmlToText(html).slice(0, 15000)
    if (text.length < 120) {
      throw new Error('Page had too little text. Is it a JS-rendered SPA?')
    }

    // 2. Structure via OpenAI
    const extracted = await extractWithOpenAI(apiKey!, text)

    // 3. Embed + insert
    const supabase = createClient()
    let productsAdded = 0
    let faqsAdded = 0

    for (const p of extracted.products) {
      if (!p.name?.trim()) continue
      try {
        const embedding = await embedText(
          apiKey!,
          `${p.name}\n${p.description ?? ''}\n${p.usage_notes ?? ''}`
        )
        await supabase.from('products').insert({
          tenant_id: tenant.id,
          name: p.name.trim(),
          handle: p.name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 80),
          description: p.description ?? '',
          usage_notes: p.usage_notes ?? '',
          embedding,
          metadata: { source_url: url, imported_at: new Date().toISOString() },
        })
        productsAdded++
      } catch (err) {
        console.error('product insert failed', err)
      }
    }

    for (const f of extracted.faqs) {
      if (!f.question?.trim() || !f.answer?.trim()) continue
      try {
        const embedding = await embedText(apiKey!, `${f.question}\n${f.answer}`)
        await supabase.from('faqs').insert({
          tenant_id: tenant.id,
          category: f.category?.trim() || 'website',
          question: f.question.trim(),
          answer: f.answer.trim(),
          embedding,
        })
        faqsAdded++
      } catch (err) {
        console.error('faq insert failed', err)
      }
    }

    revalidatePath(`/dashboard/${slug}/knowledge`)
    redirect(
      `/dashboard/${slug}/knowledge?imported=1&p=${productsAdded}&f=${faqsAdded}&url=${encodeURIComponent(url)}`
    )
  } catch (err) {
    redirect(
      `/dashboard/${slug}/knowledge?error=${encodeURIComponent((err as Error).message)}`
    )
  }
}

type Tab = 'products' | 'faqs' | 'recipes' | 'documents'

async function deleteDocument(slug: string, id: string) {
  'use server'
  const supabase = createClient()
  // chunks cascade-delete via FK; still explicit for clarity
  await supabase.from('documents').delete().eq('id', id)
  revalidatePath(`/dashboard/${slug}/knowledge`)
}

export default async function KnowledgePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: {
    tab?: Tab
    added?: string
    error?: string
    imported?: string
    p?: string
    f?: string
    url?: string
    importNote?: string
  }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const tab: Tab = (searchParams.tab as Tab) ?? 'products'
  const supabase = createClient()
  const [{ data: products }, { data: recipes }, { data: faqs }, { data: documents }] =
    await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('recipes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('faqs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('documents')
        .select('id, title, source_type, original_filename, file_size_bytes, chunk_count, created_at')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false }),
    ])

  const counts = {
    products: products?.length ?? 0,
    faqs: faqs?.length ?? 0,
    recipes: recipes?.length ?? 0,
    documents: documents?.length ?? 0,
  }

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: 'products', label: 'Products', icon: Package, count: counts.products },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle, count: counts.faqs },
    { id: 'documents', label: 'Documents', icon: FileText, count: counts.documents },
    { id: 'recipes', label: 'Recipes', icon: UtensilsCrossed, count: counts.recipes },
  ]

  const hasApiKey = Boolean(tenant.openai_api_key_encrypted)

  return (
    <div className="space-y-6">
      {searchParams.added && <Alert tone="success">Item added to the knowledge base.</Alert>}
      {searchParams.imported && (
        <Alert tone="success">
          Imported from {searchParams.url}: {searchParams.p ?? 0} product
          {searchParams.p === '1' ? '' : 's'} · {searchParams.f ?? 0} FAQ
          {searchParams.f === '1' ? '' : 's'}. Review below and edit as needed.
        </Alert>
      )}
      {searchParams.importNote === 'preview' && (
        <Alert tone="info">
          Preview mode — website scraping is disabled. In real mode we'd fetch{' '}
          {searchParams.url}, extract products and FAQs with GPT, and drop them into the lists
          below.
        </Alert>
      )}
      {searchParams.error === 'no_api_key' && (
        <Alert tone="warning">
          Add an OpenAI API key in Settings before uploading knowledge — we need it to generate
          embeddings.
        </Alert>
      )}
      {searchParams.error && searchParams.error !== 'no_api_key' && (
        <Alert tone="danger">{searchParams.error}</Alert>
      )}

      {/* Import from URL */}
      <div className="bg-gradient-to-br from-white to-accent-soft/40 border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink text-accent-fg flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold flex items-center gap-2">
              Import from a website
              <Badge tone="warning">AI</Badge>
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Paste any URL — your page, product catalog, FAQ page, about — and we'll extract
              products and FAQs automatically. You can edit or delete anything afterwards.
            </p>
          </div>
        </div>
        <form
          action={importFromUrl.bind(null, params.slug)}
          className="p-5 flex flex-col md:flex-row gap-2"
        >
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input
              name="url"
              type="url"
              required
              placeholder="https://crewful.com"
              className="w-full border border-border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40 bg-surface"
            />
          </div>
          <Button type="submit" variant="primary">
            <Download className="w-4 h-4" />
            Import
          </Button>
        </form>
        <div className="px-5 pb-4 text-[11px] text-ink-muted flex flex-wrap gap-x-4 gap-y-1">
          <span>✓ Works with most static/SSR sites (Shopify, Webflow, Framer)</span>
          <span>✗ Won't work on JS-only SPAs without SSR</span>
          <span>· Extracted items are marked with the source URL</span>
        </div>
      </div>


      {!hasApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            No OpenAI key configured — new items won't be embedded and the bot won't find them.{' '}
            <Link
              href={`/dashboard/${params.slug}/settings`}
              className="underline font-medium"
            >
              Add it in Settings
            </Link>
            .
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <Link
              key={t.id}
              href={`/dashboard/${params.slug}/knowledge?tab=${t.id}`}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px ${
                active
                  ? 'border-ink text-ink font-medium'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-ink text-accent-fg' : 'bg-surface-sunken text-ink-muted'
                }`}
              >
                {t.count}
              </span>
            </Link>
          )
        })}
      </div>

      {tab === 'products' && (
        <KindPanel
          slug={params.slug}
          kind="product"
          kindLabel="product"
          icon={Package}
          items={products ?? []}
          itemTitle={(p) => p.name}
          itemSubtitle={(p) => p.description}
          itemMeta={(p) => (p.metadata?.source_url ? 'imported' : undefined)}
          formFields={
            <>
              <Field label="Name" name="name" required />
              <TextArea label="Description" name="description" rows={2} />
              <TextArea
                label="Usage notes"
                name="usage_notes"
                rows={2}
                help="How and when to use it. Pairings, context, tips."
              />
            </>
          }
        />
      )}

      {tab === 'faqs' && (
        <KindPanel
          slug={params.slug}
          kind="faq"
          kindLabel="FAQ"
          icon={HelpCircle}
          items={faqs ?? []}
          itemTitle={(f) => f.question}
          itemSubtitle={(f) => f.answer}
          itemMeta={(f) => f.category}
          formFields={
            <>
              <Field label="Category" name="category" placeholder="shipping / allergens / ..." />
              <Field label="Question" name="question" required />
              <TextArea label="Answer" name="answer" rows={3} required />
            </>
          }
        />
      )}

      {tab === 'recipes' && (
        <KindPanel
          slug={params.slug}
          kind="recipe"
          kindLabel="recipe"
          icon={UtensilsCrossed}
          items={recipes ?? []}
          itemTitle={(r) => r.title}
          itemSubtitle={(r) => r.description}
          formFields={
            <>
              <Field label="Title" name="title" required />
              <TextArea label="Description" name="description" rows={2} />
              <TextArea label="Ingredients" name="ingredients" rows={3} />
              <TextArea label="Steps" name="steps" rows={4} />
            </>
          }
        />
      )}

      {tab === 'documents' && (
        <Card
          title="Upload documents"
          description="Drop PDFs, Markdown or plain text files. The bot will chunk them, embed each chunk, and reference them like any other knowledge."
        >
          <DocumentUpload
            slug={params.slug}
            documents={documents ?? []}
            deleteAction={deleteDocument}
          />
        </Card>
      )}
    </div>
  )
}

function KindPanel({
  slug,
  kind,
  kindLabel,
  icon,
  items,
  itemTitle,
  itemSubtitle,
  itemMeta,
  formFields,
}: {
  slug: string
  kind: 'product' | 'faq' | 'recipe'
  kindLabel: string
  icon: any
  items: any[]
  itemTitle: (i: any) => string
  itemSubtitle?: (i: any) => string | undefined
  itemMeta?: (i: any) => string | undefined
  formFields: React.ReactNode
}) {
  const addAction = addItem.bind(null, slug, kind)

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Add {kindLabel}</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            New items are embedded automatically and indexed for search.
          </p>
        </div>
        <form action={addAction} className="p-5 space-y-4">
          {formFields}
          <Button type="submit" variant="primary">
            <Plus className="w-4 h-4" />
            Add {kindLabel}
          </Button>
        </form>
      </div>

      <div>
        {items.length === 0 ? (
          <EmptyState
            icon={icon}
            title={`No ${kindLabel}s yet`}
            description="Add your first one using the form."
          />
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Existing ({items.length})</h2>
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              <EditableKnowledgeList
                slug={slug}
                kind={kind}
                items={items}
                updateAction={updateItem}
                deleteAction={deleteItem}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
