import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Each function is wrapped in React.cache — Next.js memoizes per request,
// so calling getTenantBySlug('kru') 5 times across layout + page components
// only hits Supabase once.

export const getCurrentUser = cache(async () => {
  const supabase = createClient()
  // getSession() reads the JWT from the cookie locally — no network round-trip.
  // getUser() would re-validate against the auth server on EVERY page render
  // (~150ms from AR), which is what was making dashboard navigation feel laggy.
  // Per-tenant data queries still go through RLS, so an invalid token fails
  // there safely.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')
  return session.user
})

export const isLivvAdmin = cache(async () => {
  const supabase = createClient()
  const { data } = await supabase.rpc('is_livv_admin')
  return Boolean(data)
})

export const getUserTenants = cache(async () => {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_users')
    .select('role, tenant:tenants(id, slug, name, brand_config, is_active)')
  return data ?? []
})

export const getTenantBySlug = cache(async (slug: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
})

export const getTenantStats = cache(
  async (tenantId: string): Promise<{
    products: number
    faqs: number
    recipes: number
    conversations: number
    documents: number
  }> => {
    const supabase = createClient()
    const { data } = await supabase.rpc('tenant_stats', { p_tenant_id: tenantId })
    if (data && typeof data === 'object') return data as any
    return { products: 0, faqs: 0, recipes: 0, conversations: 0, documents: 0 }
  }
)
