import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ingestFileForTenant } from '@/lib/document-ingest'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE_MB = 15
const ALLOWED_EXT = ['.pdf', '.txt', '.md']

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ ok: false, error: 'invalid form data' }, { status: 400 })
  }

  const slug = String(formData.get('slug') ?? '')
  const file = formData.get('file') as File | null

  if (!slug || !file) {
    return NextResponse.json(
      { ok: false, error: 'missing slug or file' },
      { status: 400 }
    )
  }

  const lowerName = file.name.toLowerCase()
  if (!ALLOWED_EXT.some((ext) => lowerName.endsWith(ext))) {
    return NextResponse.json(
      { ok: false, error: `file type not allowed. Allowed: ${ALLOWED_EXT.join(', ')}` },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: `file too large. Max ${MAX_FILE_SIZE_MB}MB` },
      { status: 413 }
    )
  }

  // Authorization check via RLS
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()
  if (error || !tenant) {
    return NextResponse.json(
      { ok: false, error: 'tenant not found or not authorized' },
      { status: 403 }
    )
  }

  const result = await ingestFileForTenant(slug, file)
  return NextResponse.json(result)
}
