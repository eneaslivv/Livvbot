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
import { MessageContent } from '@/components/MessageContent'
import { MessageActions } from '@/components/MessageActions'
import { HumanReplyComposer } from '@/components/HumanReplyComposer'
import Link from 'next/link'
import { Mail, UserCheck, Filter } from 'lucide-react'

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

type FilterKey = 'all' | 'leads' | 'handoffs' | 'unresolved'

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { filter?: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const filter: FilterKey = (['leads', 'handoffs', 'unresolved'].includes(searchParams.filter ?? '')
    ? searchParams.filter
    : 'all') as FilterKey

  const supabase = createClient()
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (filter === 'leads') query = query.not('lead_data->>email', 'is', null)
  if (filter === 'handoffs') query = query.eq('handoff_triggered', true)
  if (filter === 'unresolved') query = query.eq('handoff_triggered', true).neq('human_status', 'resolved')
  const { data: conversations } = await query

  const list = conversations ?? []

  // Load my own feedback for these conversations so we can pre-fill the thumbs.
  const convIds = list.map((c: any) => c.id)
  const { data: sessionData } = await supabase.auth.getSession()
  const myUserId = sessionData.session?.user.id ?? null
  let feedbackRows: any[] = []
  if (convIds.length > 0 && myUserId) {
    const { data } = await supabase
      .from('message_feedback')
      .select('conversation_id, message_index, rating')
      .in('conversation_id', convIds)
      .eq('created_by', myUserId)
    feedbackRows = data ?? []
  }
  const feedbackMap = new Map<string, 1 | -1>()
  for (const f of feedbackRows) {
    feedbackMap.set(`${f.conversation_id}:${f.message_index}`, f.rating as 1 | -1)
  }
  const bc = tenant.brand_config ?? {}
  const accent = bc.accentColor ?? '#d4a017'
  const primary = bc.primaryColor ?? '#111110'

  // Stats are computed across ALL conversations for this tenant — they
  // shouldn't change just because the user toggled a filter.
  const { data: stats } = await supabase
    .from('conversations')
    .select('id, handoff_triggered, human_status, lead_data')
    .eq('tenant_id', tenant.id)
  const totalAll = stats?.length ?? 0
  const handoffCount = (stats ?? []).filter((c: any) => c.handoff_triggered).length
  const unresolvedCount = (stats ?? []).filter(
    (c: any) => c.handoff_triggered && c.human_status !== 'resolved'
  ).length
  const leadsCount = (stats ?? []).filter(
    (c: any) => c.lead_data && (c.lead_data.email || c.lead_data.phone)
  ).length
  const totalMessages = list.reduce(
    (acc: number, c: any) => acc + (Array.isArray(c.messages) ? c.messages.length : 0),
    0
  )

  const tabs: { key: FilterKey; label: string; count: number; icon: any }[] = [
    { key: 'all', label: 'All', count: totalAll, icon: MessageSquare },
    { key: 'leads', label: 'Leads', count: leadsCount, icon: Mail },
    { key: 'handoffs', label: 'Handoffs', count: handoffCount, icon: AlertTriangle },
    { key: 'unresolved', label: 'Unresolved', count: unresolvedCount, icon: UserCheck },
  ]

  if (totalAll === 0) {
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
      {/* Summary stats — 4 pills now: Sessions / Leads / Handoffs / Unresolved */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill label="Sessions" value={totalAll} icon={MessageSquare} />
        <StatPill label="Leads" value={leadsCount} icon={Mail} accent="emerald" />
        <StatPill label="Handoffs" value={handoffCount} icon={AlertTriangle} accent="amber" />
        <StatPill label="Unresolved" value={unresolvedCount} icon={UserCheck} accent={unresolvedCount > 0 ? 'amber' : 'neutral'} />
      </div>

      {/* Unresolved handoff banner — only shows when something is pending */}
      {unresolvedCount > 0 && filter !== 'unresolved' && (
        <Link
          href={`/dashboard/${params.slug}/conversations?filter=unresolved`}
          style={{ background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}
          className="flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 hover:brightness-95 transition-all"
        >
          <div className="flex items-center gap-2.5 text-[13.5px]">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--warn)' }}
            />
            <strong className="font-medium">{unresolvedCount}</strong>{' '}
            conversation{unresolvedCount === 1 ? '' : 's'} waiting for a human reply
          </div>
          <span className="text-[12px] font-medium inline-flex items-center gap-1">Open queue →</span>
        </Link>
      )}

      {/* Filter chips — pill style with ink-on-cream active state */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-ink-faint mr-1" />
        {tabs.map((t) => {
          const Icon = t.icon
          const active = filter === t.key
          const href =
            t.key === 'all'
              ? `/dashboard/${params.slug}/conversations`
              : `/dashboard/${params.slug}/conversations?filter=${t.key}`
          return (
            <Link
              key={t.key}
              href={href}
              className={`inline-flex items-center gap-1.5 text-[12.5px] h-8 px-3 rounded-full transition-all duration-150 ease-[cubic-bezier(.16,1,.3,1)] ${
                active
                  ? 'bg-ink text-[var(--cream-50)]'
                  : 'bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink)] hover:bg-[var(--cream-50)]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{t.label}</span>
              <span
                className={`tabular-nums text-[10.5px] ${
                  active ? 'opacity-60' : 'text-ink-faint'
                }`}
              >
                {t.count}
              </span>
            </Link>
          )
        })}
        {filter !== 'all' && (
          <span className="meta ml-2">Showing {list.length} of {totalAll}</span>
        )}
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
                    {c.handoff_triggered && c.human_status !== 'resolved' && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Needs reply
                      </span>
                    )}
                    {c.human_status === 'resolved' && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Resolved
                      </span>
                    )}
                    {c.lead_data?.email && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-semibold lowercase tracking-wide"
                        title={`Lead captured: ${c.lead_data.email}`}
                      >
                        <Mail className="w-2.5 h-2.5" />
                        {c.lead_data.email.length > 24 ? c.lead_data.email.slice(0, 22) + '…' : c.lead_data.email}
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
                    const isHuman = m.role === 'human'
                    const ts = m.ts ? formatTime(m.ts) : ''
                    // Find the user message that prompted this assistant reply,
                    // walking back from the current index. Used by the Improve modal.
                    let precedingUserMsg = ''
                    if (!isUser && !isHuman) {
                      for (let j = i - 1; j >= 0; j--) {
                        if (msgs[j]?.role === 'user') {
                          precedingUserMsg = String(msgs[j].content ?? '')
                          break
                        }
                      }
                    }
                    const ratingKey = `${c.id}:${i}`
                    const initialRating = feedbackMap.get(ratingKey) ?? 0
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 msg-animate group/msg ${
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
                          {isHuman && (
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1 inline-flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Team {m.author_email ? `· ${m.author_email}` : ''}
                            </div>
                          )}
                          <div
                            className={`relative px-4 py-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap shadow-card ${
                              isUser
                                ? 'text-white rounded-br-md'
                                : isHuman
                                  ? 'bg-emerald-50 text-emerald-900 rounded-bl-md border border-emerald-200'
                                  : 'bg-surface text-ink rounded-bl-md border border-border'
                            }`}
                            style={
                              isUser
                                ? { background: primary }
                                : undefined
                            }
                          >
                            <MessageContent text={m.content} />
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
                          {!isUser && !isHuman && (
                            <MessageActions
                              slug={params.slug}
                              conversationId={c.id}
                              messageIndex={i}
                              userQuery={precedingUserMsg}
                              originalMessage={String(m.content ?? '')}
                              initialRating={initialRating}
                            />
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

                  {/* Composer to reply as a human, plus mark-resolved / reopen */}
                  <HumanReplyComposer
                    slug={params.slug}
                    conversationId={c.id}
                    humanStatus={(c.human_status ?? 'open') as 'open' | 'claimed' | 'resolved'}
                  />
                </div>
              </div>
            </details>
          )
        })}
      </div>

      <div className="text-center text-[11px] text-ink-faint pt-2">
        Showing {list.length} of {totalAll} · Last {totalMessages} messages total
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
  // Editorial palette — soft tints on cream surfaces. The icon background
  // hints at the metric's tone without screaming.
  const tones: Record<typeof accent, { bg: string; fg: string }> = {
    neutral: { bg: 'var(--cream-100)', fg: 'var(--ink-soft)' },
    emerald: { bg: 'var(--success-bg)', fg: 'var(--success-fg)' },
    amber: { bg: 'var(--warn-bg)', fg: 'var(--warn-fg)' },
  }
  const t = tones[accent]
  return (
    <div className="bg-surface border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-[0_1px_2px_rgba(41,24,24,0.03)]">
      <div
        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0"
        style={{ background: t.bg, color: t.fg }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[22px] font-light tracking-[-0.03em] tabular-nums leading-none">{value}</div>
        <div className="meta mt-1">{label}</div>
      </div>
    </div>
  )
}
