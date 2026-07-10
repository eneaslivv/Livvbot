import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Auth callback for magic-link + password reset flows. Handles three cases:
//   1. Supabase returned an ?error= (link expired, already used, etc.)
//      → bounce back to /login with a readable message.
//   2. A ?code= comes back from a magic link → exchange it for a session
//      and land the user in /dashboard (or the ?next= they requested).
//   3. Neither param present → not a legitimate callback; send to /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (errorParam) {
    const msg = errorDesc ?? errorParam
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(msg)}`
    )
  }

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
