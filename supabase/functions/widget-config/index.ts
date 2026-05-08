import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts'

// Public read-only endpoint that serves the widget's brand config + quick
// actions. The widget calls this on init so changes in /dashboard settings
// (position, colors, greeting, etc.) propagate without re-pasting the embed.

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const url = new URL(req.url)
  const tenantSlug =
    url.searchParams.get('tenant') ?? req.headers.get('x-tenant-slug')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(origin, ['*']) })
  }

  if (!tenantSlug) {
    return json({ error: 'missing tenant' }, 400, origin, ['*'])
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('slug, name, brand_config, quick_actions, website_url, allowed_origins, is_active')
    .eq('slug', tenantSlug)
    .eq('is_active', true)
    .single()

  if (error || !tenant) {
    return json({ error: 'tenant not found' }, 404, origin, ['*'])
  }

  if (!isOriginAllowed(origin, tenant.allowed_origins)) {
    return json({ error: 'origin not allowed' }, 403, origin, tenant.allowed_origins)
  }

  const bc = (tenant.brand_config ?? {}) as Record<string, unknown>
  const customTemplate =
    typeof bc.productUrlTemplate === 'string' && (bc.productUrlTemplate as string).trim()
      ? (bc.productUrlTemplate as string).trim()
      : null
  const productUrlTemplate =
    customTemplate ??
    (tenant.website_url
      ? `${String(tenant.website_url).replace(/\/+$/, '')}/products/{handle}`
      : undefined)

  return json(
    {
      brand: {
        botName: bc.botName ?? tenant.name,
        mascotUrl: bc.mascotUrl ?? '',
        primaryColor: bc.primaryColor ?? '#1a1a1a',
        accentColor: bc.accentColor ?? '#d4a017',
        greeting: bc.greeting ?? 'Hi! How can I help?',
        placeholder: bc.placeholder ?? 'Ask me anything...',
        position: bc.position === 'left' ? 'left' : 'right',
        productUrlTemplate,
      },
      quickActions: tenant.quick_actions ?? [],
    },
    200,
    origin,
    tenant.allowed_origins,
    { 'Cache-Control': 'public, max-age=30' }
  )
})

function json(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: string[],
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(origin, allowedOrigins),
      ...extraHeaders,
    },
  })
}
