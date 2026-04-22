import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: [
          'Geist Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
      },
      colors: {
        // Semantic tokens — resolve to CSS vars set in globals.css per theme
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          sunken: 'var(--surface-sunken)',
          raised: 'var(--surface-raised)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          subtle: 'var(--border-subtle)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          fg: 'var(--accent-fg)',
          soft: 'var(--accent-soft)',
          glow: 'var(--accent-glow)',
        },
        // Status colors consistent across themes
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
          fg: 'var(--success-fg)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          bg: 'var(--warn-bg)',
          fg: 'var(--warn-fg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
          fg: 'var(--danger-fg)',
        },
      },
      boxShadow: {
        card: '0 0 0 1px var(--border)',
        'card-hover': '0 0 0 1px var(--border-strong)',
        elevated:
          '0 0 0 1px var(--border), 0 8px 24px -4px var(--shadow-color, rgba(0,0,0,0.08))',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
