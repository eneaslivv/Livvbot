import { ReactNode } from 'react'

export function Card({
  title,
  description,
  children,
  footer,
}: {
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {(title || description) && (
        <div className="px-5 py-4 border-b border-border">
          {title && <h2 className="font-semibold">{title}</h2>}
          {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-border bg-surface-sunken">{footer}</div>
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
      <label className="block text-xs font-medium text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted font-mono">
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
          className={`w-full border border-border rounded-md py-2 text-sm focus:outline-none focus:border-ink transition-colors bg-surface ${
            prefix ? 'pl-10 pr-3' : 'px-3'
          } ${type === 'color' ? 'h-10 p-1 cursor-pointer' : ''}`}
        />
      </div>
      {help && <p className="text-[11px] text-ink-muted mt-1">{help}</p>}
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
      <label className="block text-xs font-medium text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        required={required}
        className={`w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors bg-surface resize-y ${
          mono ? 'font-mono text-[12px] leading-relaxed' : ''
        }`}
      />
      {help && <p className="text-[11px] text-ink-muted mt-1">{help}</p>}
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
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-muted border border-border',
    success: 'bg-success-bg text-success-fg border border-success/20',
    warning: 'bg-warn-bg text-warn-fg border border-warn/20',
    danger: 'bg-danger-bg text-danger-fg border border-danger/20',
  }
  return (
    <span
      className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${tones[tone]}`}
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
    <div className="bg-surface border border-border rounded-lg p-10 text-center">
      <div className="w-12 h-12 mx-auto rounded-lg bg-surface-sunken flex items-center justify-center mb-3 border border-border">
        <Icon className="w-6 h-6 text-ink-faint" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-xs text-ink-muted mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
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
  const tones = {
    info: 'bg-success-bg border-success/20 text-success-fg',
    success: 'bg-success-bg border-success/20 text-success-fg',
    warning: 'bg-warn-bg border-warn/20 text-warn-fg',
    danger: 'bg-danger-bg border-danger/20 text-danger-fg',
  }
  return (
    <div className={`border rounded-md px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  )
}
