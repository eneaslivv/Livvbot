import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  Hash,
  Zap,
  Package,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { EmptyState } from '@/components/ui'

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ConversationsPage({
  params,
}: {
  params: { slug: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const supabase = createClient()
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  const list = conversations ?? []
  const bc = tenant.brand_config ?? {}
  const accent = bc.accentColor ?? '#d4a017'
  const primary = bc.primaryColor ?? '#111110'

  const totalMessages = list.reduce(
    (acc: number, c: any) => acc + (Array.isArray(c.messages) ? c.messages.length : 0),
    0
  )
  const handoffCount = list.filter((c: any) => c.handoff_triggered).length
  const resolvedCount = list.length - handoffCount

  if (list.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        description="They'll appear here once users start chatting with the widget."
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill label="Sessions" value={list.length} icon={MessageSquare} />
        <StatPill label="Resolved" value={resolvedCount} icon={CheckCircle2} accent="emerald" />
        <StatPill label="Handoffs" value={handoffCount} icon={AlertTriangle} accent="amber" />
      </div>

      <div className="space-y-3">
        {list.map((c: any) => {
          const msgs = Array.isArray(c.messages) ? c.messages : []
          const first = msgs.find((m: any) => m.role === 'user') ?? msgs[0]
          const userMsgs = msgs.filter((m: any) => m.role === 'user').length

          return (
            <details
              key={c.id}
              className="group bg-surface border border-border rounded-lg overflow-hidden hover:border-border-strong transition-colors"
            >
              <summary className="px-5 py-4 cursor-pointer list-none hover:bg-surface-sunken/60 flex items-start gap-4">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    c.handoff_triggered
                      ? 'bg-amber-50 text-amber-700 ring-2 ring-amber-100'
                      : 'bg-surface-sunken text-ink-soft ring-2 ring-border-subtle'
                  }`}
                >
                  {c.user_ip_hash ? c.user_ip_hash.slice(0, 2).toUpperCase() : '??'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {c.handoff_triggered && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Handoff
                      </span>
                    )}
                    {c.product_context?.name && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-surface-sunken text-ink-soft px-1.5 py-0.5 rounded font-semibold tracking-wider">
                        <Package className="w-2.5 h-2.5" />
                        {c.product_context.name}
                      </span>
                    )}
                    <span className="text-[11px] text-ink-muted inline-flex items-center gap-1 font-mono">
                      <Hash className="w-2.5 h-2.5" />
                      {c.session_id.slice(-6)}
                    </span>
                  </div>
                  <div className="text-sm text-ink truncate mb-1.5">
                    {first?.content ?? '—'}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-muted tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {userMsgs} message{userMsgs === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelative(c.updated_at)}
                    </span>
                    {c.token_usage?.total_tokens && (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {c.token_usage.total_tokens} tokens
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-ink-faint mt-1 group-open:rotate-90 transition-transform shrink-0" />
              </summary>

              {/* Expanded chat */}
              <div className="border-t border-border bg-surface-sunken/50 texture-dots">
                <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
                  {msgs.map((m: any, i: number) => {
                    const isUser = m.role === 'user'
                    const ts = m.ts ? formatTime(m.ts) : ''
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 msg-animate ${
                          isUser ? 'flex-row-reverse' : 'flex-row'
                        }`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold overflow-hidden ${
                            isUser ? 'bg-ink text-accent-fg' : ''
                          }`}
                          style={
                            !isUser
                              ? {
                                  background: `${accent}1a`,
                                  color: primary,
                                }
                              : undefined
                          }
                        >
                          {!isUser && bc.mascotUrl ? (
                            <img
                              src={bc.mascotUrl}
                              alt={bc.botName ?? ''}
                              className="w-full h-full object-cover"
                            />
                          ) : isUser ? (
                            'U'
                          ) : (
                            (bc.botName?.[0] ?? 'B').toUpperCase()
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`relative px-4 py-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap shadow-card ${
                              isUser
                                ? 'text-white rounded-br-md'
                                : 'bg-surface text-ink rounded-bl-md border border-border'
                            }`}
                            style={
                              isUser
                                ? { background: primary }
                                : undefined
                            }
                          >
                            {m.content}
                          </div>
                          {ts && (
                            <div
                              className={`text-[10px] text-ink-faint mt-1 tabular-nums ${
                                isUser ? 'text-right' : 'text-left'
                              }`}
                            >
                              {ts}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {c.handoff_triggered && c.handoff_reason && (
                    <div className="flex justify-center pt-2">
                      <div className="inline-flex items-center gap-1.5 text-[11px] bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Handoff triggered: <span className="font-mono">{c.handoff_reason}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          )
        })}
      </div>

      <div className="text-center text-[11px] text-ink-faint pt-2">
        Showing {list.length} of {list.length} · Last {totalMessages} messages total
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  icon: Icon,
  accent = 'neutral',
}: {
  label: string
  value: number
  icon: any
  accent?: 'neutral' | 'emerald' | 'amber'
}) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-soft',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
  }
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[accent]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-[11px] text-ink-muted mt-0.5">{label}</div>
      </div>
    </div>
  )
}
