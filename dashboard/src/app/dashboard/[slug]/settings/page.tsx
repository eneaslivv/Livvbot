import { getTenantBySlug } from '@/lib/tenant'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Card, Field, TextArea, Button, Alert } from '@/components/ui'
import { SettingsNav } from '@/components/SettingsNav'
import { QuickActionsEditor } from '@/components/QuickActionsEditor'
import { WebsiteSync } from '@/components/WebsiteSync'
import { Save } from 'lucide-react'

async function updateSettings(slug: string, formData: FormData) {
  'use server'
  const supabase = createClient()

  const botName = String(formData.get('botName') ?? '')
  const mascotUrl = String(formData.get('mascotUrl') ?? '')
  const primaryColor = String(formData.get('primaryColor') ?? '#1a1a1a')
  const accentColor = String(formData.get('accentColor') ?? '#d4a017')
  const greeting = String(formData.get('greeting') ?? '')
  const placeholder = String(formData.get('placeholder') ?? '')

  const systemPrompt = String(formData.get('systemPrompt') ?? '')
  const openaiApiKey = String(formData.get('openaiApiKey') ?? '').trim()
  const openaiModel = String(formData.get('openaiModel') ?? 'gpt-4o-mini')
  const fallbackEmail = String(formData.get('fallbackEmail') ?? '')
  const allowedOriginsRaw = String(formData.get('allowedOrigins') ?? '')
  const handoffKeywordsRaw = String(formData.get('handoffKeywords') ?? '')
  const isActive = formData.get('isActive') === 'on'
  const websiteUrl = String(formData.get('websiteUrl') ?? '').trim() || null
  const quickActionsRaw = String(formData.get('quickActions') ?? '[]')
  let quickActions: any[] = []
  try {
    const parsed = JSON.parse(quickActionsRaw)
    if (Array.isArray(parsed)) quickActions = parsed
  } catch {}

  const payload: Record<string, any> = {
    brand_config: {
      botName,
      mascotUrl,
      primaryColor,
      accentColor,
      greeting,
      placeholder,
    },
    system_prompt: systemPrompt,
    openai_model: openaiModel,
    fallback_email: fallbackEmail,
    allowed_origins: allowedOriginsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    handoff_keywords: handoffKeywordsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    is_active: isActive,
    quick_actions: quickActions,
    website_url: websiteUrl,
  }

  if (openaiApiKey && !openaiApiKey.startsWith('\u2022')) {
    payload.openai_api_key_encrypted = openaiApiKey
  }

  const { error } = await supabase.from('tenants').update(payload).eq('slug', slug)

  if (error) {
    console.error(error)
    redirect(`/dashboard/${slug}/settings?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/dashboard/${slug}`)
  redirect(`/dashboard/${slug}/settings?saved=1`)
}

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { saved?: string; error?: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const bc = tenant.brand_config ?? {}
  const maskedKey = tenant.openai_api_key_encrypted
    ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + String(tenant.openai_api_key_encrypted).slice(-4)
    : ''

  const action = updateSettings.bind(null, params.slug)

  return (
    <form action={action} className="flex gap-8">
      <SettingsNav />

      <div className="flex-1 space-y-6 min-w-0">
        {searchParams.saved && <Alert tone="success">Settings saved.</Alert>}
        {searchParams.error && <Alert tone="danger">Error: {searchParams.error}</Alert>}

        <section id="branding" className="scroll-mt-6">
          <Card
            title="Branding"
            description="How the bot looks and introduces itself to your visitors."
          >
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Bot name" name="botName" defaultValue={bc.botName ?? ''} required />
                <Field
                  label="Mascot image URL"
                  name="mascotUrl"
                  defaultValue={bc.mascotUrl ?? ''}
                  placeholder="https://..."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label="Primary color"
                  name="primaryColor"
                  type="color"
                  defaultValue={bc.primaryColor ?? '#1a1a1a'}
                  help="Header + user message bubbles."
                />
                <Field
                  label="Accent color"
                  name="accentColor"
                  type="color"
                  defaultValue={bc.accentColor ?? '#d4a017'}
                  help="Send button + highlights."
                />
              </div>
              <Field
                label="Greeting"
                name="greeting"
                defaultValue={bc.greeting ?? ''}
                help="First message the user sees when opening the chat."
              />
              <Field
                label="Input placeholder"
                name="placeholder"
                defaultValue={bc.placeholder ?? ''}
              />
            </div>
          </Card>
        </section>

        <section id="ai" className="scroll-mt-6">
          <Card
            title="AI & prompt"
            description="Personality, model, and the API key that powers the bot."
          >
            <div className="space-y-4">
              <TextArea
                label="System prompt"
                name="systemPrompt"
                defaultValue={tenant.system_prompt ?? ''}
                rows={6}
                help="Defines personality, tone, and guardrails. Avoid inventing facts \u2014 use the knowledge base instead."
                required
                mono
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label="OpenAI API key"
                  name="openaiApiKey"
                  type="password"
                  defaultValue=""
                  placeholder={maskedKey || 'sk-...'}
                  help={
                    maskedKey
                      ? `Currently stored: ${maskedKey}. Leave blank to keep unchanged.`
                      : 'Required for the bot to respond. Your key, your bill.'
                  }
                />
                <Field
                  label="Model"
                  name="openaiModel"
                  defaultValue={tenant.openai_model ?? 'gpt-4o-mini'}
                  help="gpt-4o-mini is the recommended default."
                />
              </div>
            </div>
          </Card>
        </section>

        <section id="website" className="scroll-mt-6">
          <Card
            title="Website"
            description="Point the bot at the client's canonical URL. Click Sync to crawl the sitemap and ingest products and FAQs automatically."
          >
            <div className="space-y-4">
              <Field
                label="Website URL"
                name="websiteUrl"
                type="url"
                defaultValue={tenant.website_url ?? ''}
                placeholder="https://crewful.com"
                help="Used by the Sync button below to discover and ingest content. The site must expose a sitemap.xml or link to one from robots.txt."
              />
              <div className="pt-2 border-t border-border-subtle">
                <WebsiteSync
                  slug={params.slug}
                  websiteUrl={tenant.website_url ?? null}
                  lastSyncedAt={tenant.last_synced_at ?? null}
                />
              </div>
            </div>
          </Card>
        </section>

        <section id="quick-actions" className="scroll-mt-6">
          <Card
            title="Quick actions"
            description="Shortcut pills shown in the widget. Optionally scope them to specific URL paths (e.g. /products for product pages)."
          >
            <QuickActionsEditor
              initialValue={Array.isArray(tenant.quick_actions) ? tenant.quick_actions : []}
            />
          </Card>
        </section>

        <section id="handoff" className="scroll-mt-6">
          <Card
            title="Handoff"
            description="When the bot should step aside and send users to a human."
          >
            <div className="space-y-4">
              <Field
                label="Fallback email"
                name="fallbackEmail"
                type="email"
                defaultValue={tenant.fallback_email ?? ''}
                placeholder="support@yourcompany.com"
              />
              <TextArea
                label="Handoff keywords"
                name="handoffKeywords"
                defaultValue={(tenant.handoff_keywords ?? []).join(', ')}
                rows={2}
                help="Comma-separated. When the user message contains any of these, the bot replies with a link to the fallback email."
              />
            </div>
          </Card>
        </section>

        <section id="cors" className="scroll-mt-6">
          <Card
            title="Allowed origins (CORS)"
            description="The chat endpoint will only respond to requests from these origins."
          >
            <TextArea
              label="Origins"
              name="allowedOrigins"
              defaultValue={(tenant.allowed_origins ?? []).join(', ')}
              rows={2}
              help={'Comma-separated. e.g. "https://crewful.com, https://www.crewful.com"'}
            />
          </Card>
        </section>

        <section id="status" className="scroll-mt-6">
          <Card title="Status">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={tenant.is_active}
                className="w-4 h-4 rounded border-border accent-ink"
              />
              <div>
                <div className="text-sm font-medium">Tenant active</div>
                <div className="text-xs text-ink-muted">
                  When off, the chat endpoint returns 404 for this tenant.
                </div>
              </div>
            </label>
          </Card>
        </section>

        <div className="flex justify-end sticky bottom-4">
          <div className="bg-surface border border-border rounded-lg shadow-elevated px-2 py-1.5">
            <Button type="submit" variant="primary">
              <Save className="w-4 h-4" />
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
