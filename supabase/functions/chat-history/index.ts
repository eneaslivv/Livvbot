import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts'

// Returns the message history for a given (tenantSlug, sessionId).
// Lets the widget pick up replies authored by a human in the dashboard
// the next time the visitor opens or refreshes the chat.

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const url = new URL(req.url)
  const tenantSlug = url.searchParams.get('tenant') ?? req.headers.get('x-tenant-slug')
  const sessionId = url.searchParams.get('session')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(origin, ['*']) })
  }
  if (!tenantSlug || !sessionId) {
    return json({ error: 'missing tenant or session' }, 400, origin, ['*'])
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, allowed_origins, is_active')
    .eq('slug', tenantSlug)
    .eq('is_active', true)
    .single()

  if (!tenant) return json({ error: 'tenant not found' }, 404, origin, ['*'])
  if (!isOriginAllowed(origin, tenant.allowed_origins)) {
    return json({ error: 'origin not allowed' }, 403, origin, tenant.allowed_origins)
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('messages, human_status, handoff_triggered')
    .eq('tenant_id', tenant.id)
    .eq('session_id', sessionId)
    .maybeSingle()

  return json(
    {
      messages: conv?.messages ?? [],
      humanStatus: conv?.human_status ?? 'open',
      handoffTriggered: Boolean(conv?.handoff_triggered),
    },
    200,
    origin,
    tenant.allowed_origins,
    { 'Cache-Control': 'no-store' }
  )
})

function json(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: string[],
  extra: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(origin, allowedOrigins),
      ...extra,
    },
  })
}
