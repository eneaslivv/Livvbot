'use client'

import { useEffect, useState } from 'react'
import { Paintbrush, Cpu, MailQuestion, Globe2, Power, Zap, Link2 } from 'lucide-react'

const sections = [
  { id: 'branding', label: 'Branding', icon: Paintbrush },
  { id: 'ai', label: 'AI & prompt', icon: Cpu },
  { id: 'website', label: 'Website', icon: Link2 },
  { id: 'quick-actions', label: 'Quick actions', icon: Zap },
  { id: 'handoff', label: 'Handoff', icon: MailQuestion },
  { id: 'cors', label: 'Allowed origins', icon: Globe2 },
  { id: 'status', label: 'Status', icon: Power },
]

export function SettingsNav() {
  const [active, setActive] = useState<string>('branding')

  useEffect(() => {
    const handler = () => {
      let current = sections[0].id
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= 120) {
          current = s.id
        }
      }
      setActive(current)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className="sticky top-4 w-48 shrink-0 hidden md:block">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-2 px-2">
        On this page
      </div>
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const Icon = s.icon
          const isActive = active === s.id
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'bg-white text-ink font-medium shadow-card'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
                }`}
              >
                <Icon className={`w-[14px] h-[14px] ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                {s.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
