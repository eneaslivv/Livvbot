import Link from 'next/link'
import { getUserTenants, isLivvAdmin, getCurrentUser } from '@/lib/tenant'
import { Plus, ArrowUpRight, Bot, Sparkles, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardIndex() {
  const user = await getCurrentUser()
  const tenants = await getUserTenants()
  const admin = await isLivvAdmin()

  // Per-tenant ready state
  const supabase = createClient()
  const tenantsWithStats = await Promise.all(
    tenants.map(async (tu: any) => {
      const t = tu.tenant
      if (!t) return null
      const [{ count: convCount }, { count: productCount }] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
      ])
      const ready =
        Boolean(t.openai_api_key_encrypted) &&
        (t.allowed_origins?.length ?? 0) > 0 &&
        t.is_active
      return {
        ...tu,
        tenant: t,
        stats: { conv: convCount ?? 0, products: productCount ?? 0 },
        ready,
      }
    })
  )

  const list = tenantsWithStats.filter(Boolean) as any[]

  const firstName = (user.email ?? '').split('@')[0].split('.')[0]
  const hello = firstName ? `Welcome back, ${firstName[0].toUpperCase()}${firstName.slice(1)}.` : 'Welcome back.'

  return (
    <div className="px-8 py-12 max-w-5xl">
      <div className="flex items-end justify-between mb-9 gap-6 anim-up">
        <div>
          <div className="eyebrow mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Dashboard
          </div>
          <h1 className="text-[32px] font-light tracking-[-0.04em] leading-none">{hello}</h1>
          <p className="text-[13.5px] text-ink-muted mt-2.5 max-w-lg leading-relaxed">
            {list.length === 0
              ? "You don't have any bots yet."
              : `${list.length} bot${list.length === 1 ? '' : 's'} assigned to your account.`}
          </p>
        </div>
        {admin && (
          <Link
            href="/admin/tenants/new"
            style={{ backgroundImage: 'var(--gradient-gold)', color: 'var(--parchment)' }}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium h-9 px-4 rounded-full transition-all hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.22),0_0_24px_var(--accent-glow)]"
          >
            <Plus className="w-3.5 h-3.5" />
            New tenant
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        admin ? (
          <div className="bg-surface border border-border rounded-lg p-10 shadow-card">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-lg hero-shimmer flex items-center justify-center ring-1 ring-border shrink-0">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-base">Launch your first bot</h2>
                <p className="text-sm text-ink-muted mt-1 max-w-lg">
                  Create a tenant for a client. You'll configure branding, AI model, knowledge
                  base and allowed origins — the embed snippet is generated automatically.
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <Link
                    href="/admin/tenants/new"
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-ink text-accent-fg px-4 py-2 rounded-lg hover:bg-ink-soft transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create a bot
                  </Link>
                  <Link
                    href="/admin/tenants"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink px-3 py-2 rounded-lg hover:bg-surface-sunken transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Browse all tenants
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-subtle grid md:grid-cols-3 gap-4 text-xs text-ink-muted">
              <div>
                <div className="font-semibold text-ink-soft mb-1">1. Create the tenant</div>
                Company name, slug (URL id), bot name. Takes 30 seconds.
              </div>
              <div>
                <div className="font-semibold text-ink-soft mb-1">2. Configure + ingest KB</div>
                Paste the client's OpenAI key, add domains, import KB from their website.
              </div>
              <div>
                <div className="font-semibold text-ink-soft mb-1">3. Copy embed snippet</div>
                Give the client one script tag they paste in their theme.
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-12 text-center shadow-[0_1px_2px_rgba(41,24,24,0.03),0_4px_12px_-4px_rgba(41,24,24,0.05)]">
            <div
              className="w-16 h-16 mx-auto rounded-2xl hero-shimmer flex items-center justify-center mb-5"
              style={{ boxShadow: 'inset 0 0 0 1px var(--border-strong)' }}
            >
              <Bot className="w-7 h-7" style={{ color: 'var(--wine-500)' }} />
            </div>
            <div className="eyebrow mb-2">Access</div>
            <p className="text-[16px] font-medium tracking-[-0.01em] text-ink mb-1.5">
              No bots here yet
            </p>
            <p className="text-[13px] text-ink-muted mt-1 max-w-[36ch] mx-auto leading-relaxed">
              Your invite hasn't landed here yet. Contact LIVV Studio at{' '}
              <a href="mailto:hola@livv.systems" className="underline underline-offset-2 hover:text-ink transition-colors">
                hola@livv.systems
              </a>{' '}
              and we'll set you up.
            </p>
          </div>
        )
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((tu, idx) => {
            const t = tu.tenant
            const bc = t.brand_config ?? {}
            const primary = bc.primaryColor ?? '#111110'
            const accent = bc.accentColor ?? '#ffffff'

            return (
              <Link
                key={t.id}
                href={`/dashboard/${t.slug}`}
                className="group relative bg-surface border border-border rounded-2xl p-6 hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.10)] hover:border-border-strong transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] overflow-hidden anim-up"
                style={{
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {/* Brand strip — thinner, gold rail underneath */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
                />
                <div className="flex items-start justify-between mb-5 mt-1">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: primary,
                      boxShadow: '0 6px 18px -6px rgba(41,24,24,0.28), inset 0 0 0 1px rgba(255,255,255,0.08)',
                    }}
                  >
                    {bc.mascotUrl ? (
                      <img src={bc.mascotUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 500,
                          fontFamily: 'var(--font-display)',
                          color: accent,
                          lineHeight: 1,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {t.name
                          .split(' ')
                          .map((w: string) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.01em] px-2 py-[3px] rounded-full"
                      style={
                        tu.ready
                          ? { background: 'var(--success-bg)', color: 'var(--success-fg)' }
                          : { background: 'var(--warn-bg)', color: 'var(--warn-fg)' }
                      }
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${tu.ready ? 'animate-pulse-dot' : ''}`}
                        style={{ background: tu.ready ? 'var(--success)' : 'var(--warn)' }}
                      />
                      {tu.ready ? 'Live' : 'Setup'}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-[17px] font-medium tracking-[-0.01em]">{t.name}</h3>
                  {!t.is_active && (
                    <span className="meta uppercase" style={{ background: 'var(--cream-100)' }}>
                      off
                    </span>
                  )}
                </div>
                <div className="meta mb-5">
                  {bc.botName ?? 'Unnamed bot'} · /{t.slug}
                </div>

                <div
                  className="flex items-center gap-4 pt-4 text-[11px] text-ink-muted tabular-nums"
                  style={{ borderTop: '1px dashed var(--border-strong)' }}
                >
                  <span>
                    <strong className="text-ink font-medium tabular-nums">{tu.stats.products}</strong>{' '}
                    <span className="text-ink-muted">products</span>
                  </span>
                  <span>
                    <strong className="text-ink font-medium tabular-nums">{tu.stats.conv}</strong>{' '}
                    <span className="text-ink-muted">conversations</span>
                  </span>
                  <span className="ml-auto meta uppercase">{tu.role}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
