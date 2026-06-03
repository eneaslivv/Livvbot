'use client'

import { useEffect, useState } from 'react'
import { Paintbrush, Cpu, MailQuestion, Globe2, Power, Zap, Link2, Shield, GraduationCap } from 'lucide-react'

const sections = [
  { id: 'branding', label: 'Branding', icon: Paintbrush },
  { id: 'ai', label: 'AI & prompt', icon: Cpu },
  { id: 'personality', label: 'Personality', icon: Shield },
  { id: 'training', label: 'Training', icon: GraduationCap },
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
    <nav className="sticky top-4 w-52 shrink-0 hidden md:block">
      <div className="eyebrow mb-3 px-2">On this page</div>
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const Icon = s.icon
          const isActive = active === s.id
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all duration-150 ease-[cubic-bezier(.16,1,.3,1)] ${
                  isActive
                    ? 'bg-[var(--cream-100)] text-ink font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-[var(--cream-50)]'
                }`}
              >
                {isActive && <span className="nav-active-strip" aria-hidden />}
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
