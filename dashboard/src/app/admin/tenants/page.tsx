import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Building2, Check, X, ArrowUpRight } from 'lucide-react'
import { Badge, EmptyState } from '@/components/ui'

export default async function AdminTenantsPage() {
  const supabase = createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  const list = tenants ?? []
  const active = list.filter((t: any) => t.is_active).length

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All tenants</h1>
          <p className="text-sm text-ink-muted mt-1">
            {list.length} total · {active} active
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-1.5 text-xs font-medium bg-ink text-accent-fg px-3 py-2 rounded-lg hover:bg-ink-soft"
        >
          <Plus className="w-3.5 h-3.5" />
          New tenant
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants yet"
          description="Create your first client to get started."
          action={
            <Link
              href="/admin/tenants/new"
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-ink text-accent-fg px-3 py-2 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              New tenant
            </Link>
          }
        />
      ) : (
        <div className="bg-surface border border-border rounded-lg divide-y divide-border overflow-hidden">
          {list.map((t: any) => {
            const initials = t.name
              .split(' ')
              .map((w: string) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
            return (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.slug}`}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-surface-sunken"
              >
                <div className="w-10 h-10 rounded-lg bg-ink text-accent-fg flex items-center justify-center text-sm font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-ink-muted">/{t.slug}</span>
                    {!t.is_active && <Badge tone="warning">inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-muted">
                    <span className="flex items-center gap-1">
                      {t.openai_api_key_encrypted ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      API key
                    </span>
                    <span>·</span>
                    <span>{t.allowed_origins?.length ?? 0} origins</span>
                    <span>·</span>
                    <span>Model: {t.openai_model}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
