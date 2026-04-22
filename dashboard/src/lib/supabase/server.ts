import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createMockClient } from './mock'

export function createClient() {
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
    return createMockClient()
  }

  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: any }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // `set` solo funciona en Server Actions / Route Handlers, no en Server Components.
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
    return createMockClient()
  }
  const { createClient: createAdminSb } = require('@supabase/supabase-js')
  return createAdminSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
