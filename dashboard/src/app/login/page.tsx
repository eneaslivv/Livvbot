'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, Check, Lock, KeyRound, AlertCircle } from 'lucide-react'

type Mode = 'password' | 'magiclink'
type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('magiclink')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  // Callback bounces back here with ?error= when the magic link is stale
  // or something went wrong on the Supabase side. Surface it once, then
  // clean the URL so a refresh doesn't keep showing the error.
  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam) {
      const humanised =
        errParam === 'auth_failed'
          ? 'That link expired or was already used. Enter your email again.'
          : errParam
      setStatus('error')
      setError(humanised)
      // Strip query so a hard reload doesn't re-show it
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus('error')
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setStatus('error')
      setError(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(1200px 600px at 20% 15%, var(--accent-soft), transparent 60%), radial-gradient(900px 700px at 85% 85%, rgba(122,64,56,0.12), transparent 55%), var(--gradient-hero)',
      }}
    >
      {/* Signature texture over the cream gradient */}
      <div
        className="absolute inset-0 texture-dots opacity-40 pointer-events-none"
        aria-hidden
      />

      <div className="w-full max-w-[400px] relative">
        {/* Brand mark from the Livv Studio design system */}
        <div className="flex flex-col items-center mb-8 anim-up">
          <svg width="52" height="52" viewBox="0 0 180 180" className="mb-4 block" style={{ borderRadius: 12 }}>
            <rect width="180" height="180" rx="37" fill="var(--cream-900)" />
            <g transform="scale(0.95) translate(4.5 4.5)">
              <path fill="var(--cream-50)" d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z" />
              <path fill="var(--cream-50)" d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z" />
            </g>
          </svg>
          <div className="eyebrow mb-1">Studio Console</div>
          <h1 className="text-[28px] font-light tracking-[-0.03em] leading-none">
            LIVV <span className="text-gold">Bots</span>
          </h1>
        </div>

        <div
          className="bg-surface rounded-2xl overflow-hidden anim-up"
          style={{
            border: '1px solid var(--border)',
            boxShadow:
              '0 1px 2px rgba(41,24,24,0.04), 0 18px 48px -12px rgba(41,24,24,0.14)',
            animationDelay: '80ms',
          }}
        >
          {status === 'sent' && mode === 'magiclink' ? (
            <div className="p-10 text-center">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--success-bg)', color: 'var(--success-fg)' }}
              >
                <Check className="w-7 h-7" strokeWidth={1.8} />
              </div>
              <h2 className="text-[17px] font-medium tracking-[-0.01em] mb-1.5">Check your inbox</h2>
              <p className="text-[13px] text-ink-muted leading-relaxed">
                We sent a magic link to <br />
                <strong className="text-ink font-medium">{email}</strong>
              </p>
              <p className="text-[11.5px] text-ink-faint mt-6">
                Can't find it? Check spam, or{' '}
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="underline hover:text-ink transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex items-center" style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => { setMode('magiclink'); setStatus('idle'); setError(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-medium relative transition-all ${
                    mode === 'magiclink' ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Magic link
                  {mode === 'magiclink' && (
                    <span
                      className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full"
                      style={{ background: 'var(--gradient-gold)' }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('password'); setStatus('idle'); setError(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-medium relative transition-all ${
                    mode === 'password' ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Password
                  {mode === 'password' && (
                    <span
                      className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full"
                      style={{ background: 'var(--gradient-gold)' }}
                    />
                  )}
                </button>
              </div>

              <form
                onSubmit={mode === 'password' ? handlePasswordSubmit : handleMagicLinkSubmit}
                className="p-8"
              >
                <div className="eyebrow mb-2">Sign in</div>
                <h2 className="text-[19px] font-light tracking-[-0.02em] mb-1.5">
                  Welcome back
                </h2>
                <p className="text-[13px] text-ink-muted mb-6 leading-relaxed">
                  {mode === 'password'
                    ? 'Sign in with your email and password.'
                    : "We'll email you a one-time link — no password needed."}
                </p>

                <label htmlFor="email" className="block text-[12px] font-medium text-ink-soft mb-1.5 tracking-[0.01em]">
                  Email
                </label>
                <div className="relative mb-4">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus={!email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg pl-10 pr-3 py-[10px] text-[13px] transition-all focus:outline-none placeholder:text-ink-faint"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border-strong)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--ink)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    placeholder="you@company.com"
                  />
                </div>

                {mode === 'password' && (
                  <>
                    <label htmlFor="password" className="block text-[12px] font-medium text-ink-soft mb-1.5 tracking-[0.01em]">
                      Password
                    </label>
                    <div className="relative mb-5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                      <input
                        id="password"
                        type="password"
                        required
                        autoFocus={Boolean(email)}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg pl-10 pr-3 py-[10px] text-[13px] transition-all focus:outline-none placeholder:text-ink-faint"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border-strong)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--ink)'
                          e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-strong)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  style={{
                    backgroundImage: 'var(--gradient-gold)',
                    color: 'var(--parchment)',
                  }}
                  className="w-full rounded-full py-2.5 text-[13.5px] font-medium transition-all inline-flex items-center justify-center gap-1.5 hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(41,24,24,0.22),0_0_24px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                >
                  {status === 'sending' ? (
                    mode === 'password' ? 'Signing in…' : 'Sending…'
                  ) : mode === 'password' ? (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Send magic link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {error && (
                  <div
                    className="mt-3 rounded-lg px-3 py-2 text-[12px] flex items-start gap-2"
                    style={{ background: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[12px] text-ink-muted mt-6">
          Don't have access yet?{' '}
          <a
            href="mailto:hola@livv.systems"
            className="underline underline-offset-2 hover:text-ink transition-colors"
          >
            Request an invite
          </a>
        </p>
      </div>
    </main>
  )
}
