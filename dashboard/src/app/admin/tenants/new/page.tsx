import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, Field, Button } from '@/components/ui'
import { ArrowLeft, Plus } from 'lucide-react'

async function createTenant(formData: FormData) {
  'use server'
  const slug = String(formData.get('slug') ?? '').toLowerCase().trim()
  const name = String(formData.get('name') ?? '').trim()
  const botName = String(formData.get('botName') ?? '').trim()

  if (!slug || !name) return

  // Pre-populate the major no-code / hosting platforms so the embed
  // snippet works the moment a tenant pastes it on Shopify, Lovable,
  // Webflow, Framer, Vercel preview, etc. Bare hosts also cover
  // subdomains via the chat function's matcher.
  const defaultAllowedOrigins = [
    'lovable.app',
    'lovable.dev',
    'myshopify.com',
    'shopify.com',
    'shopifypreview.com',
    'webflow.io',
    'framer.app',
    'framer.website',
    'vercel.app',
    'netlify.app',
    'wixsite.com',
    'wix.com',
    'squarespace.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
  ]

  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      slug,
      name,
      brand_config: {
        botName: botName || name,
        primaryColor: '#1a1a1a',
        accentColor: '#d4a017',
        greeting: `Hi! I'm ${botName || name}. How can I help?`,
        placeholder: 'Ask me anything...',
      },
      system_prompt: `You are ${botName || name}, the assistant for ${name}. Be helpful, concise, and honest. Never invent facts.`,
      allowed_origins: defaultAllowedOrigins,
    })
    .select()
    .single()

  if (error) {
    // Duplicate slug is a common-enough mistake that it deserves a clearer
    // error and a one-click path forward to the existing tenant.
    if (error.code === '23505' || /duplicate/i.test(error.message)) {
      redirect(`/admin/tenants/new?error=slug_taken&slug=${encodeURIComponent(slug)}`)
    }
    redirect(`/admin/tenants/new?error=${encodeURIComponent(error.message)}`)
  }

  // Auto-add the LIVV admin who created this tenant as its first owner.
  // Without this row the new tenant doesn't show up in their sidebar
  // ("YOUR BOTS") because getUserTenants() filters by tenant_users
  // membership. They can still reach it from /admin/tenants but the
  // sidebar dropping it makes the tenant feel "missing".
  // Uses the service-role client so it bypasses RLS — the auth check
  // already happened in the admin layout (isLivvAdmin).
  try {
    const supabaseAuth = createClient()
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession()
    const userId = session?.user.id
    if (userId) {
      const admin = createAdminClient()
      await admin.from('tenant_users').upsert(
        { tenant_id: data.id, user_id: userId, role: 'owner' },
        { onConflict: 'tenant_id,user_id' }
      )
    }
  } catch {
    // Non-fatal: the tenant exists; the admin can self-assign from
    // /admin/tenants/<slug> if this somehow failed.
  }

  redirect(`/admin/tenants/${data.slug}`)
}

export default function NewTenantPage({
  searchParams,
}: {
  searchParams: { error?: string; slug?: string }
}) {
  const slugTaken = searchParams.error === 'slug_taken'
  const takenSlug = searchParams.slug ?? ''

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href="/admin/tenants"
        className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink mb-2"
      >
        <ArrowLeft className="w-3 h-3" /> All tenants
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New tenant</h1>
      <p className="text-sm text-ink-muted mt-1 mb-6">
        Create the record for a new client. You can fine-tune everything afterwards in Settings.
      </p>

      {slugTaken && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 rounded-lg flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">Slug already in use</div>
            <div className="text-xs mt-0.5 text-amber-800">
              A tenant with the slug <span className="font-mono">{takenSlug}</span> already exists.
              Either pick a different slug or open the existing one.
            </div>
          </div>
          {takenSlug && (
            <Link
              href={`/admin/tenants/${takenSlug}`}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium bg-ink text-accent-fg px-2.5 py-1.5 rounded-md hover:bg-ink-soft"
            >
              Open it →
            </Link>
          )}
        </div>
      )}
      {searchParams.error && !slugTaken && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-900 text-sm px-4 py-2 rounded-lg">
          {searchParams.error}
        </div>
      )}

      <form action={createTenant}>
        <Card>
          <div className="space-y-4">
            <Field
              label="Slug"
              name="slug"
              required
              placeholder="kru"
              help="URL-safe identifier. Lowercase, alphanumeric, dashes only. Used in the embed snippet."
            />
            <Field
              label="Company name"
              name="name"
              required
              placeholder="KRU Food"
            />
            <Field
              label="Bot name"
              name="botName"
              placeholder="Crew"
              help="Optional. Defaults to the company name if left blank."
            />
          </div>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Link
            href="/admin/tenants"
            className="text-sm text-ink-muted px-3 py-2 rounded-lg hover:bg-surface-sunken"
          >
            Cancel
          </Link>
          <Button type="submit" variant="primary">
            <Plus className="w-4 h-4" />
            Create tenant
          </Button>
        </div>
      </form>
    </div>
  )
}
