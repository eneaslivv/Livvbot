import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from './mock'

export function createClient() {
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
    return createMockClient()
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
