import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import { BotPreview } from '@/components/BotPreview'
import {
  Key,
  Globe,
  Database,
  Power,
  ArrowUpRight,
  Package,
  UtensilsCrossed,
  HelpCircle,
  MessagesSquare,
  Sparkles,
  Copy,
  ExternalLink,
  Pencil,
} from 'lucide-react'

export default async function TenantOverview({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const supabase = createClient()
  const bc = tenant.brand_config ?? {}

  const [products, recipes, faqs, conversations] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
  ])

  const stats = [
    { label: 'Products', value: products.count ?? 0, icon: Package, href: 'knowledge?tab=products', color: 'blue' },
    { label: 'FAQs', value: faqs.count ?? 0, icon: HelpCircle, href: 'knowledge?tab=faqs', color: 'purple' },
    { label: 'Recipes', value: recipes.count ?? 0, icon: UtensilsCrossed, href: 'knowledge?tab=recipes', color: 'orange' },
    { label: 'Conversations', value: conversations.count ?? 0, icon: MessagesSquare, href: 'conversations', color: 'emerald' },
  ] as const

  const hasApiKey = Boolean(tenant.openai_api_key_encrypted)
  const hasOrigins = (tenant.allowed_origins?.length ?? 0) > 0
  const hasContent = (products.count ?? 0) + (faqs.count ?? 0) > 0

  const checklist = [
    { done: hasApiKey, label: 'OpenAI API key', description: 'Required so the bot can respond.', icon: Key, href: 'settings#ai' },
    { done: hasOrigins, label: 'Allowed origins (CORS)', description: 'Domains where the widget can run.', icon: Globe, href: 'settings#cors' },
    { done: hasContent, label: 'Knowledge base', description: 'Products and FAQs the bot can reference.', icon: Database, href: 'knowledge' },
    { done: tenant.is_active, label: 'Tenant active', description: 'Serves requests from the widget.', icon: Power, href: 'settings#status' },
  ]

  const done = checklist.filter((c) => c.done).length
  const pct = Math.round((done / checklist.length) * 100)
  const ready = done === checklist.length

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="gradient-border hero-shimmer border border-border rounded-lg p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 texture-dots opacity-40 pointer-events-none" />
        <div className="relative flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center shadow-lg shrink-0 ring-2 ring-white"
            style={{
              background: bc.primaryColor ?? '#111110',
              color: bc.accentColor ?? '#ffffff',
            }}
          >
            {bc.mascotUrl ? (
              <img src={bc.mascotUrl} alt="" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span className="text-xl font-black">
                {(bc.botName ?? tenant.name)[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-[11px] text-ink-muted uppercase tracking-wider">
              <span className="font-semibold">{tenant.openai_model}</span>
              <span>·</span>
              <span>{(tenant.allowed_origins?.length ?? 0)} origin{tenant.allowed_origins?.length === 1 ? '' : 's'}</span>
              {tenant.fallback_email && (
                <>
                  <span>·</span>
                  <span className="normal-case tracking-normal">fallback → {tenant.fallback_email}</span>
                </>
              )}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-1">
              {bc.botName ?? tenant.name}
            </h2>
            <p className="text-sm text-ink-soft max-w-lg line-clamp-2">
              "{bc.greeting ?? 'No greeting configured.'}"
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                ready
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-500 animate-pulse-dot' : 'bg-amber-500'}`} />
              {ready ? 'Live' : 'Needs setup'}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/${params.slug}/settings#branding`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft bg-surface border border-border px-2.5 py-1.5 rounded-lg hover:border-border-strong hover:text-ink transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Link>
              <Link
                href={`/dashboard/${params.slug}/embed`}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-ink text-accent-fg px-3 py-1.5 rounded-lg hover:bg-ink-soft transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Get embed code
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          const colors: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
            emerald: 'bg-emerald-50 text-emerald-600',
          }
          return (
            <Link
              key={s.label}
              href={`/dashboard/${params.slug}/${s.href}`}
              className="group bg-surface border border-border rounded-lg p-4 hover:shadow-card-hover hover:border-border-strong transition-all"
            >
              <div className="flex items-start justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[s.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-3xl font-semibold tracking-tight tabular-nums mt-3">
                {s.value}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{s.label}</div>
            </Link>
          )
        })}
      </div>

      {/* Checklist */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold">Setup checklist</h2>
              <p className="text-[11px] text-ink-muted">
                {done}/{checklist.length} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
              <div
                className="h-full bg-ink rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-ink-soft">{pct}%</span>
          </div>
        </div>
        <ul className="divide-y divide-border-subtle">
          {checklist.map((c, i) => {
            const Icon = c.icon
            return (
              <li key={i} className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-surface-sunken/50 transition-colors">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    c.done
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200'
                      : 'bg-surface-sunken text-ink-faint ring-2 ring-border-subtle'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${c.done ? 'text-ink' : 'text-ink-soft'}`}>
                    {c.label}
                  </div>
                  <div className="text-[11px] text-ink-muted">{c.description}</div>
                </div>
                {c.done ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Done
                  </span>
                ) : (
                  c.href && (
                    <Link
                      href={`/dashboard/${params.slug}/${c.href}`}
                      className="text-[11px] font-medium text-ink hover:text-ink-soft inline-flex items-center gap-1"
                    >
                      Configure
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Live preview */}
      <BotPreview tenant={tenant} apiUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} />

      {/* Bot identity / config */}
      <div className="grid md:grid-cols-2 gap-4">
        <InfoCard
          title="Identity"
          subtitle="How the bot presents itself."
          editHref={`/dashboard/${params.slug}/settings#branding`}
        >
          <InfoRow label="Bot name" value={bc.botName ?? '—'} />
          <InfoRow label="Greeting" value={bc.greeting ?? '—'} mono />
          <InfoRow label="Placeholder" value={bc.placeholder ?? '—'} mono />
          <InfoRow label="Model" value={tenant.openai_model} mono editHref={`/dashboard/${params.slug}/settings#ai`} />
        </InfoCard>

        <InfoCard
          title="Delivery"
          subtitle="Where and how the bot runs."
          editHref={`/dashboard/${params.slug}/settings#cors`}
        >
          <InfoRow
            label="Allowed origins"
            value={
              tenant.allowed_origins?.length
                ? tenant.allowed_origins.join(', ')
                : 'None configured'
            }
            mono
          />
          <InfoRow
            label="Handoff keywords"
            value={
              tenant.handoff_keywords?.length ? tenant.handoff_keywords.join(', ') : 'None'
            }
            mono
            editHref={`/dashboard/${params.slug}/settings#handoff`}
          />
          <InfoRow
            label="Fallback email"
            value={tenant.fallback_email ?? '—'}
            mono
            editHref={`/dashboard/${params.slug}/settings#handoff`}
          />
          <InfoRow
            label="Created"
            value={new Date(tenant.created_at).toLocaleDateString()}
          />
        </InfoCard>
      </div>
    </div>
  )
}

function InfoCard({
  title,
  subtitle,
  editHref,
  children,
}: {
  title: string
  subtitle?: string
  editHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-[11px] text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {editHref && (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-ink px-2 py-1 rounded-md hover:bg-surface-sunken transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Link>
        )}
      </div>
      <dl className="space-y-3 text-sm">{children}</dl>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
  editHref,
}: {
  label: string
  value: string
  mono?: boolean
  editHref?: string
}) {
  return (
    <div className="group flex items-start gap-3">
      <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider w-28 shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className={`flex-1 min-w-0 break-words ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value}
      </dd>
      {editHref && (
        <Link
          href={editHref}
          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-ink transition-opacity"
          title="Edit"
        >
          <Pencil className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}
