import { ReactNode } from 'react'

export function Card({
  title,
  description,
  eyebrow,
  children,
  footer,
}: {
  title?: string
  description?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(41,24,24,0.03),0_4px_12px_-4px_rgba(41,24,24,0.05)]">
      {(title || description || eyebrow) && (
        <div className="px-6 py-5 border-b border-border-subtle">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          {title && (
            <h2 className="text-[15px] font-medium tracking-[-0.01em]">{title}</h2>
          )}
          {description && (
            <p className="text-[12.5px] text-ink-muted mt-1 max-w-[46ch] leading-relaxed">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-border-subtle bg-[var(--cream-50)]">{footer}</div>
      )}
    </div>
  )
}

export function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  help,
  placeholder,
  required,
  prefix,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  help?: string
  placeholder?: string
  required?: boolean
  prefix?: string
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink-soft mb-1.5 tracking-[0.01em]">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] text-ink-faint font-mono">
            {prefix}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className={`w-full border border-border-strong rounded-lg py-[9px] text-[13px] focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_var(--accent-soft)] transition-all bg-surface placeholder:text-ink-faint ${
            prefix ? 'pl-8 pr-3' : 'px-3'
          } ${type === 'color' ? 'h-10 p-1 cursor-pointer' : ''}`}
        />
      </div>
      {help && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  )
}

export function TextArea({
  label,
  name,
  defaultValue,
  rows = 4,
  help,
  required,
  mono,
}: {
  label: string
  name: string
  defaultValue?: string
  rows?: number
  help?: string
  required?: boolean
  mono?: boolean
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink-soft mb-1.5 tracking-[0.01em]">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        required={required}
        className={`w-full border border-border-strong rounded-lg px-3 py-[9px] text-[13px] focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_var(--accent-soft)] transition-all bg-surface resize-y leading-relaxed placeholder:text-ink-faint ${
          mono ? 'font-mono text-[12px] leading-relaxed' : ''
        }`}
      />
      {help && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{help}</p>}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  size = 'md',
  ...rest
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  type?: 'button' | 'submit'
  size?: 'sm' | 'md' | 'lg'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  // Editorial design system: pills, not rectangles. The wine gradient
  // variant ("gold") is reserved for the highest-intent CTAs (Get embed
  // code, Invite, Publish). Primary stays as ink-on-cream for everything
  // else; secondary becomes a hairline-shadow pill on cream.
  const variants = {
    primary:
      'bg-ink text-[var(--cream-50)] hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.18)]',
    secondary:
      'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--border-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink)] hover:bg-[var(--cream-50)]',
    ghost: 'text-ink-soft hover:bg-[var(--cream-100)]',
    danger:
      'bg-surface text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_35%,transparent)] hover:bg-[var(--danger-bg)]',
    gold:
      'text-[var(--parchment)] hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.22),0_0_24px_var(--accent-glow)]',
  } as const
  const sizes = {
    sm: 'h-[30px] px-3 text-[12px]',
    md: 'h-9 px-4 text-[13px]',
    lg: 'h-[42px] px-[22px] text-sm',
  } as const
  // The wine gradient sits behind text — inline-style so Tailwind doesn't
  // tree-shake it. Other variants get tailwind classes.
  const goldStyle =
    variant === 'gold'
      ? { backgroundImage: 'var(--gradient-gold)' as string }
      : undefined
  return (
    <button
      type={type}
      style={goldStyle}
      className={`rounded-full font-medium tracking-[0.01em] inline-flex items-center gap-1.5 transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] ${variants[variant]} ${sizes[size]} disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'gold'
}) {
  const tones = {
    neutral:
      'bg-[var(--cream-100)] text-ink-soft shadow-[inset_0_0_0_1px_var(--border)]',
    success: 'text-[var(--success-fg)]',
    warning: 'text-[var(--warn-fg)]',
    danger: 'text-[var(--danger-fg)]',
    gold: 'text-[#8a6d2e]',
  } as const
  const bg: Record<typeof tone, string | undefined> = {
    neutral: undefined,
    success: 'var(--success-bg)',
    warning: 'var(--warn-bg)',
    danger: 'var(--danger-bg)',
    gold: 'var(--accent-soft)',
  }
  return (
    <span
      style={tone !== 'neutral' ? { background: bg[tone] } : undefined}
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-[3px] rounded-full leading-[1.3] tracking-[0.01em] ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 text-center shadow-[0_1px_2px_rgba(41,24,24,0.03)]">
      <div
        className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--cream-100)' }}
      >
        <Icon className="w-6 h-6 text-ink-faint" />
      </div>
      <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">{title}</p>
      {description && (
        <p className="text-[12.5px] text-ink-muted mt-1.5 max-w-[36ch] mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'success' | 'warning' | 'danger'
}) {
  const tones: Record<typeof tone, { bg: string; fg: string }> = {
    info: { bg: 'var(--success-bg)', fg: 'var(--success-fg)' },
    success: { bg: 'var(--success-bg)', fg: 'var(--success-fg)' },
    warning: { bg: 'var(--warn-bg)', fg: 'var(--warn-fg)' },
    danger: { bg: 'var(--danger-bg)', fg: 'var(--danger-fg)' },
  }
  const t = tones[tone]
  return (
    <div
      style={{ background: t.bg, color: t.fg }}
      className="rounded-xl px-4 py-3 text-[13px] leading-relaxed"
    >
      {children}
    </div>
  )
}
