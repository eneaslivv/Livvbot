import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncTenantWebsite } from '@/lib/sync-website'

// Long-running endpoint — bump the default timeout.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const slug = String(body.slug ?? '').trim()
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 })
  }

  // RLS on tenants ensures only members + admins can select this tenant — so if
  // the fetch below succeeds, the user is authorized.
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return NextResponse.json({ ok: false, error: 'tenant not found or not authorized' }, { status: 403 })
  }

  const result = await syncTenantWebsite(slug)
  return NextResponse.json(result)
}
