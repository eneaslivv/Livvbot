'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const titles: Record<string, string> = {
  '': 'Overview',
  '/settings': 'Settings',
  '/knowledge': 'Knowledge base',
  '/conversations': 'Conversations',
  '/embed': 'Embed code',
}

const subtitles: Record<string, string> = {
  '': 'Health check, bot identity and key stats.',
  '/settings': 'Branding, AI configuration, handoff and allowed origins.',
  '/knowledge': 'Content the bot can reference — products, FAQs, and recipes.',
  '/conversations': 'Recent chats. Useful to tune the prompt and knowledge base.',
  '/embed': 'Paste this snippet on any website to embed the bot.',
}

export function TenantHeader({ tenant }: { tenant: any }) {
  const pathname = usePathname()
  const segment = pathname.replace(/^\/dashboard\/[^/]+/, '')
  const title = titles[segment] ?? 'Overview'
  const subtitle = subtitles[segment] ?? ''

  const hasKey = Boolean(tenant.openai_api_key_encrypted)
  const hasOrigins = (tenant.allowed_origins?.length ?? 0) > 0
  const ready = hasKey && hasOrigins && tenant.is_active

  return (
    <header className="bg-surface border-b border-border">
      <div className="px-8 py-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11px] text-ink-muted mb-2">
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            Bots
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-faint" />
          <Link
            href={`/dashboard/${tenant.slug}`}
            className="hover:text-ink transition-colors font-medium text-ink-soft"
          >
            {tenant.name}
          </Link>
          {segment && (
            <>
              <ChevronRight className="w-3 h-3 text-ink-faint" />
              <span className="text-ink">{title}</span>
            </>
          )}
          <span className="ml-auto text-ink-faint font-mono tabular-nums">/{tenant.slug}</span>
        </nav>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-[13px] text-ink-muted mt-1 max-w-xl">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!tenant.is_active && (
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-surface-sunken text-ink-muted px-2 py-1 rounded-full">
                Inactive
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                ready
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  ready ? 'bg-emerald-500 animate-pulse-dot' : 'bg-amber-500'
                }`}
              />
              {ready ? 'Live' : 'Needs setup'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
