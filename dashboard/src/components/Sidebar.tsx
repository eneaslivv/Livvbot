'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
      {/* Brand */}
      <div className="px-4 h-14 flex items-center border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-ink text-accent-fg flex items-center justify-center text-[10px] font-black tracking-tight">
            L
          </div>
          <span className="font-semibold text-[13px] tracking-tight">LIVV Bots</span>
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
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint px-2 mb-1">
            Bot
          </div>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const href = `/dashboard/${currentSlug}${item.key}`
              const active = pathname === href
              const Icon = item.icon
              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    prefetch={true}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors group ${
                      active
                        ? 'bg-ink text-accent-fg'
                        : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
                    }`}
                  >
                    <Icon
                      className={`w-[15px] h-[15px] shrink-0 ${
                        active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                      } transition-opacity`}
                    />
                    {item.label}
                  </Link>
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
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint px-2 mb-1 mt-3">
            LIVV Studio
          </div>
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-sunken border border-border text-ink flex items-center justify-center text-[11px] font-bold shrink-0">
            {userEmail[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{userEmail}</div>
            <div className="text-[10px] text-ink-muted flex items-center gap-1">
              {isAdmin ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-success" />
                  LIVV admin
                </>
              ) : (
                'Member'
              )}
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
