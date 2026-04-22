'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const effective = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const saved = (localStorage.getItem('livv-theme') as Theme | null) ?? 'system'
    setTheme(saved)
    applyTheme(saved)

    // Respond to system theme changes when on 'system'
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if ((localStorage.getItem('livv-theme') ?? 'system') === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function pick(t: Theme) {
    setTheme(t)
    localStorage.setItem('livv-theme', t)
    applyTheme(t)
  }

  const options: { value: Theme; icon: any; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ]

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center rounded-full border border-border bg-surface p-0.5"
    >
      {options.map((o) => {
        const Icon = o.icon
        const active = theme === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(o.value)}
            title={o.label}
            aria-label={o.label}
            aria-pressed={active}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              active
                ? 'bg-ink text-accent-fg'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="w-3 h-3" />
          </button>
        )
      })}
    </div>
  )
}
