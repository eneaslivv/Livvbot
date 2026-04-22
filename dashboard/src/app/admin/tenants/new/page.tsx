import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, Field, Button } from '@/components/ui'
import { ArrowLeft, Plus } from 'lucide-react'

async function createTenant(formData: FormData) {
  'use server'
  const slug = String(formData.get('slug') ?? '').toLowerCase().trim()
  const name = String(formData.get('name') ?? '').trim()
  const botName = String(formData.get('botName') ?? '').trim()

  if (!slug || !name) return

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
    })
    .select()
    .single()

  if (error) {
    redirect(`/admin/tenants/new?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/admin/tenants/${data.slug}`)
}

export default function NewTenantPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
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

      {searchParams.error && (
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
