'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  LayoutDashboard,
  Settings,
  BookOpen,
  MessageSquare,
  Code2,
  ChevronsUpDown,
  Shield,
  LogOut,
  Plus,
  Check,
  Home,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

type Tenant = {
  id: string
  slug: string
  name: string
  brand_config?: { botName?: string; primaryColor?: string; accentColor?: string; mascotUrl?: string }
  is_active?: boolean
}

type TenantOption = {
  role: string
  tenant: Tenant
}

interface Props {
  tenants: TenantOption[]
  userEmail: string
  isAdmin: boolean
}

function slugFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/dashboard\/([^/]+)/)
  return m ? m[1] : undefined
}

const navItems = [
  { key: '', label: 'Overview', icon: LayoutDashboard },
  { key: '/settings', label: 'Settings', icon: Settings },
  { key: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { key: '/conversations', label: 'Conversations', icon: MessageSquare },
  { key: '/embed', label: 'Embed', icon: Code2 },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function NavLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string
  active: boolean
  icon: any
  label: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Intercept the click so we can wrap router.push in startTransition.
  // That gives us isPending = true the instant the user clicks, which we use
  // to render an inline spinner — so the click feels acknowledged immediately
  // even while the new page's data is still loading.
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (active || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    startTransition(() => router.push(href))
  }

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all duration-150 ease-[cubic-bezier(.16,1,.3,1)] group ${
        active
          ? 'bg-[var(--cream-100)] text-ink font-medium'
          : isPending
            ? 'bg-surface-sunken text-ink'
            : 'text-ink-soft hover:bg-[var(--cream-50)] hover:text-ink'
      }`}
    >
      {/* Gold gradient strip on the active item — Livv Studio signature */}
      {active && <span className="nav-active-strip" aria-hidden />}
      <Icon
        className={`w-4 h-4 shrink-0 ${
          active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
        } transition-opacity`}
      />
      <span className="flex-1">{label}</span>
      {isPending && (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin text-ink-muted" aria-label="loading" />
      )}
    </Link>
  )
}

function TenantAvatar({ tenant, size = 'md' }: { tenant: Tenant; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-[11px]'
  const bg = tenant.brand_config?.primaryColor ?? '#0a0a0a'
  const fg = tenant.brand_config?.accentColor ?? '#ffffff'
  if (tenant.brand_config?.mascotUrl) {
    return (
      <img
        src={tenant.brand_config.mascotUrl}
        alt={tenant.name}
        className={`${dims} rounded-md object-cover shrink-0 ring-1 ring-border`}
      />
    )
  }
  return (
    <div
      className={`${dims} rounded-md flex items-center justify-center font-bold shrink-0`}
      style={{ background: bg, color: fg }}
    >
      {initials(tenant.name)}
    </div>
  )
}

export function Sidebar({ tenants, userEmail, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const currentSlug = slugFromPath(pathname)

  const currentTenant = tenants.find((t) => t.tenant.slug === currentSlug)?.tenant

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand — Livv Studio mark from the editorial design system */}
      <div className="px-4 h-14 flex items-center border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <svg width="28" height="28" viewBox="0 0 180 180" className="block" style={{ borderRadius: 6 }}>
            <rect width="180" height="180" rx="37" fill="var(--cream-900)" />
            <g transform="scale(0.95) translate(4.5 4.5)">
              <path fill="var(--cream-50)" d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z" />
              <path fill="var(--cream-50)" d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z" />
            </g>
          </svg>
          <div className="leading-tight">
            <div className="font-semibold text-[13px] tracking-[-0.01em]">LIVV Bots</div>
            <div className="meta text-[9px] opacity-70">STUDIO CONSOLE</div>
          </div>
        </Link>
      </div>

      {/* Tenant switcher */}
      <div className="px-3 pt-3 pb-1 relative">
        {currentTenant ? (
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-md border border-border bg-surface hover:border-border-strong transition-colors text-left"
          >
            <TenantAvatar tenant={currentTenant} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{currentTenant.name}</div>
              <div className="text-[11px] text-ink-muted truncate">
                {currentTenant.brand_config?.botName ?? `/${currentTenant.slug}`}
              </div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-ink-faint shrink-0" />
          </button>
        ) : (
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-md border border-dashed border-border hover:border-border-strong text-left text-ink-muted"
          >
            <div className="w-8 h-8 rounded-md bg-surface-sunken flex items-center justify-center">
              <Home className="w-3.5 h-3.5 text-ink-faint" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-soft">Select a bot</div>
              <div className="text-[11px] text-ink-faint">{tenants.length} available</div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-ink-faint shrink-0" />
          </button>
        )}

        {switcherOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSwitcherOpen(false)}
              aria-hidden
            />
            <div className="absolute left-3 right-3 top-full mt-1.5 bg-surface-raised border border-border rounded-lg shadow-elevated z-50 overflow-hidden animate-fade-in">
              <div className="px-3 py-2 border-b border-border-subtle text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Your bots
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {tenants.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-ink-muted">
                    No bots assigned to you.
                  </div>
                ) : (
                  tenants.map((tu) => {
                    const t = tu.tenant
                    const active = t.slug === currentSlug
                    return (
                      <Link
                        key={t.id}
                        href={`/dashboard/${t.slug}`}
                        prefetch={true}
                        onClick={() => setSwitcherOpen(false)}
                        className="flex items-center gap-2.5 mx-1 px-2 py-2 rounded-md hover:bg-surface-sunken text-sm"
                      >
                        <TenantAvatar tenant={t} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-[13px]">{t.name}</span>
                            {!t.is_active && (
                              <span className="text-[9px] bg-surface-sunken text-ink-muted px-1 py-0.5 rounded font-semibold uppercase tracking-wider">
                                off
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-muted truncate">
                            /{t.slug} · {tu.role}
                          </div>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-ink shrink-0" />}
                      </Link>
                    )
                  })
                )}
              </div>
              {isAdmin && (
                <Link
                  href="/admin/tenants/new"
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 border-t border-border-subtle text-sm hover:bg-surface-sunken text-ink-soft font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New tenant
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tenant nav */}
      {currentSlug && (
        <nav className="px-2 pt-3 flex-1 overflow-y-auto">
          <div className="eyebrow px-2 mb-2">Bot</div>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const href = `/dashboard/${currentSlug}${item.key}`
              const active = pathname === href
              return (
                <li key={item.key}>
                  <NavLink href={href} active={active} icon={item.icon} label={item.label} />
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {!currentSlug && (
        <div className="px-3 pt-3 flex-1">
          {tenants.length === 0 && isAdmin ? (
            <Link
              href="/admin/tenants/new"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-ink text-accent-fg text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Create first bot
            </Link>
          ) : tenants.length === 0 ? (
            <div className="px-2 py-3 text-xs text-ink-muted leading-relaxed">
              You don't have any bots yet. Contact LIVV Studio to get access.
            </div>
          ) : (
            <div className="px-2 py-3 text-xs text-ink-muted leading-relaxed">
              Pick a bot above to see its settings, knowledge base and conversations.
            </div>
          )}
        </div>
      )}

      {/* Admin link */}
      {isAdmin && (
        <div className="px-2 pb-2">
          <div className="eyebrow px-2 mb-2 mt-4">LIVV Studio</div>
          <Link
            href="/admin/tenants"
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-ink text-accent-fg'
                : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
            }`}
          >
            <Shield className="w-[15px] h-[15px] shrink-0 opacity-70" />
            Admin
          </Link>
        </div>
      )}

      {/* Theme toggle */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-ink-muted">Theme</span>
        <ThemeToggle />
      </div>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full text-[var(--parchment)] flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ background: 'var(--gradient-gold)' }}
          >
            {userEmail[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium truncate">{userEmail}</div>
            <div className="meta text-[9.5px]">
              {isAdmin ? 'LIVV ADMIN' : 'MEMBER'}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md hover:bg-surface-sunken text-ink-muted hover:text-ink"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
