import Link from 'next/link'
import { getTenantBySlug, getTenantStats } from '@/lib/tenant'
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
  Briefcase,
  Layers,
} from 'lucide-react'

export default async function TenantOverview({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()
  const bc = tenant.brand_config ?? {}

  const counts = await getTenantStats(tenant.id)

  // The label of the "products" stat depends on the tenant's vertical so a
  // franchise / service / saas tenant doesn't read "Products: 0" for a thing
  // that doesn't exist in their world. Recipes only show for restaurants.
  const vertical = (tenant.vertical ?? 'ecommerce') as
    | 'ecommerce'
    | 'restaurant'
    | 'service'
    | 'franchise'
    | 'saas'
    | 'general'
  const productLabelByVertical: Record<typeof vertical, { label: string; icon: any }> = {
    ecommerce: { label: 'Products', icon: Package },
    restaurant: { label: 'Menu items', icon: Package },
    service: { label: 'Services', icon: Briefcase },
    franchise: { label: 'Programs', icon: Layers },
    saas: { label: 'Plans', icon: Package },
    general: { label: 'Items', icon: Package },
  }
  const productMeta = productLabelByVertical[vertical] ?? productLabelByVertical.ecommerce

  type StatSpec = {
    label: string
    value: number
    icon: any
    href: string
    color: 'blue' | 'purple' | 'orange' | 'emerald'
  }
  const stats: StatSpec[] = [
    { label: productMeta.label, value: counts.products, icon: productMeta.icon, href: 'knowledge?tab=products', color: 'blue' },
    { label: 'FAQs', value: counts.faqs, icon: HelpCircle, href: 'knowledge?tab=faqs', color: 'purple' },
    ...(vertical === 'restaurant'
      ? ([{ label: 'Recipes', value: counts.recipes, icon: UtensilsCrossed, href: 'knowledge?tab=recipes', color: 'orange' }] as StatSpec[])
      : []),
    { label: 'Conversations', value: counts.conversations, icon: MessagesSquare, href: 'conversations', color: 'emerald' },
  ]

  const hasApiKey = Boolean(tenant.openai_api_key_encrypted)
  const hasOrigins = (tenant.allowed_origins?.length ?? 0) > 0
  const hasContent = counts.products + counts.faqs + counts.documents > 0

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
      {/* Hero — editorial: large display type + italic greeting, cream gradient */}
      <div
        className="hero-shimmer border border-border-strong rounded-2xl p-7 relative overflow-hidden anim-up"
      >
        <div className="absolute inset-0 texture-dots opacity-40 pointer-events-none" style={{ maskImage: 'linear-gradient(135deg,#000,transparent 60%)' as any }} />
        <div className="relative flex items-start gap-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: bc.primaryColor ?? 'var(--cream-900)',
              boxShadow: '0 8px 24px -6px rgba(41,24,24,0.30), inset 0 0 0 1px rgba(255,255,255,0.1)',
            }}
          >
            {bc.mascotUrl ? (
              <img src={bc.mascotUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 500,
                  fontFamily: 'var(--font-display)',
                  color: bc.accentColor ?? 'var(--gold-bright)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {(bc.botName ?? tenant.name)[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="meta mb-2 flex items-center gap-2 flex-wrap">
              <span>{tenant.openai_model.toUpperCase()}</span>
              <span>·</span>
              <span>{(tenant.allowed_origins?.length ?? 0)} ORIGINS</span>
              {tenant.fallback_email && (
                <>
                  <span>·</span>
                  <span>fallback → {tenant.fallback_email}</span>
                </>
              )}
            </div>
            <h2 className="text-[32px] font-light tracking-[-0.04em] leading-none mb-2.5">
              {bc.botName ?? tenant.name}
            </h2>
            <p className="text-[14.5px] italic max-w-lg line-clamp-2" style={{ color: 'var(--ink-soft)' }}>
              "{bc.greeting ?? 'No greeting configured.'}"
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.02em] px-2.5 py-1 rounded-full"
              style={
                ready
                  ? { background: 'var(--success-bg)', color: 'var(--success-fg)' }
                  : { background: 'var(--warn-bg)', color: 'var(--warn-fg)' }
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${ready ? 'animate-pulse-dot' : ''}`}
                style={{ background: ready ? 'var(--success)' : 'var(--warn)' }}
              />
              {ready ? 'Live' : 'Needs setup'}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/${params.slug}/settings#branding`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft bg-surface px-3 py-1.5 rounded-full transition-all"
                style={{ boxShadow: 'inset 0 0 0 1px var(--border-strong)' as any }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Link>
              <Link
                href={`/dashboard/${params.slug}/embed`}
                style={{ backgroundImage: 'var(--gradient-gold)', color: 'var(--parchment)' }}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.22),0_0_24px_var(--accent-glow)]"
              >
                <Copy className="w-3.5 h-3.5" />
                Get embed code
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats — adapt grid to 3 or 4 columns based on whether Recipes shows */}
      <div className={`grid grid-cols-2 ${stats.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
        {stats.map((s) => {
          const Icon = s.icon
          // Editorial palette: soft cream backgrounds with a sage / wine /
          // gold / sky tint so the icon hue still reads but the chip sits
          // on the cream surface instead of the saturated tailwind tints.
          const tint: Record<string, { bg: string; fg: string }> = {
            blue: { bg: 'rgba(109, 190, 220, 0.14)', fg: '#3a8aa6' },
            purple: { bg: 'rgba(241, 173, 216, 0.18)', fg: '#a05286' },
            orange: { bg: 'var(--accent-soft)', fg: '#8a6d2e' },
            emerald: { bg: 'var(--success-bg)', fg: 'var(--success-fg)' },
          }
          const t = tint[s.color]
          return (
            <Link
              key={s.label}
              href={`/dashboard/${params.slug}/${s.href}`}
              className="group bg-surface border border-border rounded-2xl p-5 hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.10)] hover:-translate-y-px hover:border-border-strong transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)]"
            >
              <div className="flex items-start justify-between mb-3.5">
                <div
                  className="w-[34px] h-[34px] rounded-lg flex items-center justify-center"
                  style={{ background: t.bg, color: t.fg }}
                >
                  <Icon className="w-[17px] h-[17px]" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[34px] font-light tracking-[-0.04em] tabular-nums leading-none">
                {s.value}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{s.label}</div>
            </Link>
          )
        })}
      </div>

      {/* Checklist */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', color: '#8a6d2e' }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="eyebrow mb-1">Setup</div>
              <h2 className="text-[15px] font-medium tracking-[-0.01em]">Bot readiness</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 h-1.5 rounded-full bg-[var(--cream-100)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: 'var(--gradient-gold)' }}
              />
            </div>
            <span className="meta tabular-nums">{done}/{checklist.length} · {pct}%</span>
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
