'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  ArrowUp,
  CircleSlash,
} from 'lucide-react'

interface SyncResult {
  ok: boolean
  error?: string
  pagesCrawled: number
  productsAdded: number
  productsUpdated: number
  productsSkipped: number
  faqsAdded: number
  faqsUpdated: number
  faqsSkipped: number
  errors: string[]
  durationMs: number
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

export function WebsiteSync({
  slug,
  websiteUrl,
  lastSyncedAt,
}: {
  slug: string
  websiteUrl: string | null
  lastSyncedAt: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runSync() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/sync-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data: SyncResult = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
      } else {
        setResult(data)
        router.refresh()
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const disabled = !websiteUrl || loading

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Last synced: <strong className="text-ink-soft">{formatRelative(lastSyncedAt)}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={runSync}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-ink text-accent-fg px-3.5 py-2 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing…' : 'Sync website now'}
        </button>
      </div>

      {!websiteUrl && (
        <p className="text-xs text-ink-muted">
          Save a Website URL above before running the first sync.
        </p>
      )}

      {loading && (
        <div className="text-xs text-ink-muted border border-border rounded-md px-3 py-2 bg-surface-sunken">
          Crawling sitemap, extracting products & FAQs with GPT, generating embeddings… this can
          take 1–3 minutes depending on site size.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm bg-danger-bg border border-danger/20 text-danger-fg px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {result && result.ok && (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-surface-sunken">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold">Sync complete</span>
            <span className="text-[11px] text-ink-muted ml-auto">
              {result.pagesCrawled} pages · {(result.durationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 px-3 py-3 text-xs">
            <ResultRow icon={Plus} label="Products added" value={result.productsAdded} tone="success" />
            <ResultRow icon={ArrowUp} label="Products updated" value={result.productsUpdated} />
            <ResultRow icon={CircleSlash} label="Products unchanged" value={result.productsSkipped} tone="muted" />
            <ResultRow icon={Plus} label="FAQs added" value={result.faqsAdded} tone="success" />
            <ResultRow icon={ArrowUp} label="FAQs updated" value={result.faqsUpdated} />
            <ResultRow icon={CircleSlash} label="FAQs unchanged" value={result.faqsSkipped} tone="muted" />
          </dl>
          {result.errors.length > 0 && (
            <details className="px-3 py-2 border-t border-border text-[11px] text-ink-muted">
              <summary className="cursor-pointer">
                {result.errors.length} page{result.errors.length === 1 ? '' : 's'} failed (click)
              </summary>
              <ul className="mt-2 space-y-0.5 font-mono">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="truncate">{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function ResultRow({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: any
  label: string
  value: number
  tone?: 'neutral' | 'success' | 'muted'
}) {
  const colors = {
    success: 'text-success',
    muted: 'text-ink-faint',
    neutral: 'text-ink-soft',
  }
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3 h-3 shrink-0 ${colors[tone]}`} />
      <span className="text-ink-muted">{label}:</span>
      <span className="font-semibold tabular-nums text-ink ml-auto">{value}</span>
    </div>
  )
}
