'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bot, Mail, ArrowRight, Check, Lock, KeyRound } from 'lucide-react'

type Mode = 'password' | 'magiclink'
type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

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
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-sunken via-surface to-amber-50/30">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-ink text-accent-fg flex items-center justify-center mb-3 shadow-lg">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">LIVV Bots</h1>
          <p className="text-xs text-ink-muted mt-1">by LIVV Studio</p>
        </div>

        <div className="bg-surface rounded-lg shadow-card border border-border overflow-hidden">
          {status === 'sent' && mode === 'magiclink' ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="font-semibold mb-1">Check your inbox</h2>
              <p className="text-sm text-ink-muted">
                We sent a magic link to <strong className="text-ink">{email}</strong>.
              </p>
              <p className="text-xs text-ink-muted mt-4">
                Can't find it? Check spam, or{' '}
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="underline hover:text-ink"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex items-center border-b border-border">
                <button
                  type="button"
                  onClick={() => { setMode('password'); setStatus('idle'); setError(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    mode === 'password'
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('magiclink'); setStatus('idle'); setError(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    mode === 'magiclink'
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Magic link
                </button>
              </div>

              <form
                onSubmit={mode === 'password' ? handlePasswordSubmit : handleMagicLinkSubmit}
                className="p-7"
              >
                <h2 className="font-semibold text-lg mb-1">Sign in</h2>
                <p className="text-sm text-ink-muted mb-5">
                  {mode === 'password'
                    ? 'With your email and password.'
                    : "We'll email you a one-time link."}
                </p>

                <label htmlFor="email" className="block text-xs font-medium text-ink-soft mb-1.5">
                  Work email
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
                    className="w-full border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40"
                    placeholder="you@company.com"
                  />
                </div>

                {mode === 'password' && (
                  <>
                    <label htmlFor="password" className="block text-xs font-medium text-ink-soft mb-1.5">
                      Password
                    </label>
                    <div className="relative mb-4">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                      <input
                        id="password"
                        type="password"
                        required
                        autoFocus={Boolean(email)}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40"
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-ink text-accent-fg rounded-lg py-2.5 text-sm font-medium hover:bg-ink-soft disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {status === 'sending' ? (
                    mode === 'password' ? 'Signing in...' : 'Sending...'
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
                  <p className="text-xs text-red-600 mt-3 text-center">{error}</p>
                )}
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          Don't have access yet?{' '}
          <a href="mailto:hello@livvvv.com" className="underline hover:text-ink">
            Request an invite
          </a>
        </p>
      </div>
    </main>
  )
}
