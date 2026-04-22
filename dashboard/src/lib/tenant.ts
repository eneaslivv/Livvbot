import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function isLivvAdmin() {
  const supabase = createClient()
  const { data } = await supabase.rpc('is_livv_admin')
  return Boolean(data)
}

export async function getUserTenants() {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_users')
    .select('role, tenant:tenants(id, slug, name, brand_config, is_active)')
  return data ?? []
}

export async function getTenantBySlug(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
}
