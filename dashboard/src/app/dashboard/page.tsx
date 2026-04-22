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
    <div className="px-8 py-10 max-w-5xl">
      <div className="flex items-end justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" />
            Dashboard
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{hello}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {list.length === 0
              ? "You don't have any bots yet."
              : `${list.length} bot${list.length === 1 ? '' : 's'} assigned to your account.`}
          </p>
        </div>
        {admin && (
          <Link
            href="/admin/tenants/new"
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-ink text-accent-fg px-3 py-2 rounded-lg hover:bg-ink-soft transition-colors shadow-sm"
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
          <div className="bg-surface border border-border rounded-lg p-12 text-center shadow-card">
            <div className="w-14 h-14 mx-auto rounded-lg hero-shimmer flex items-center justify-center mb-4 ring-1 ring-border">
              <Bot className="w-6 h-6 text-ink-soft" />
            </div>
            <p className="text-sm font-medium text-ink">No bots here yet</p>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              Contact LIVV Studio at <a href="mailto:hello@livvvv.com" className="underline">hello@livvvv.com</a> to get access.
            </p>
          </div>
        )
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((tu) => {
            const t = tu.tenant
            const bc = t.brand_config ?? {}
            const primary = bc.primaryColor ?? '#111110'
            const accent = bc.accentColor ?? '#ffffff'

            return (
              <Link
                key={t.id}
                href={`/dashboard/${t.slug}`}
                className="group relative bg-surface border border-border rounded-lg p-5 hover:shadow-card-hover hover:border-border-strong transition-all overflow-hidden"
              >
                {/* Brand strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${primary}, ${accent})`,
                  }}
                />
                <div className="flex items-start justify-between mb-4 mt-1">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-sm shadow-sm ring-1 ring-black/5"
                    style={{ background: primary, color: accent }}
                  >
                    {bc.mascotUrl ? (
                      <img src={bc.mascotUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      t.name
                        .split(' ')
                        .map((w: string) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        tu.ready
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          tu.ready ? 'bg-emerald-500 animate-pulse-dot' : 'bg-amber-500'
                        }`}
                      />
                      {tu.ready ? 'Live' : 'Setup'}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="font-semibold text-[15px]">{t.name}</h3>
                  {!t.is_active && (
                    <span className="text-[10px] bg-surface-sunken text-ink-muted px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                      off
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted mb-4">
                  {bc.botName ?? 'Unnamed bot'} · /{t.slug}
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-border-subtle text-[11px] text-ink-muted tabular-nums">
                  <span>
                    <strong className="text-ink tabular-nums">{tu.stats.products}</strong> products
                  </span>
                  <span>
                    <strong className="text-ink tabular-nums">{tu.stats.conv}</strong> conversations
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold">
                    {tu.role}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
