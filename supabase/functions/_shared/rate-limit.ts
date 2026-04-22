import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WINDOW_MINUTES = 10
const MAX_REQUESTS_PER_WINDOW = 30

export async function checkRateLimit(
  supabase: SupabaseClient,
  tenantId: string,
  ipHash: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date()
  const windowStart = new Date(
    Math.floor(now.getTime() / (WINDOW_MINUTES * 60 * 1000)) *
      (WINDOW_MINUTES * 60 * 1000)
  )

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('request_count')
    .eq('tenant_id', tenantId)
    .eq('ip_hash', ipHash)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle()

  if (existing && existing.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 }
  }

  await supabase.from('rate_limits').upsert(
    {
      tenant_id: tenantId,
      ip_hash: ipHash,
      window_start: windowStart.toISOString(),
      request_count: (existing?.request_count ?? 0) + 1,
    },
    { onConflict: 'tenant_id,ip_hash,window_start' }
  )

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - ((existing?.request_count ?? 0) + 1),
  }
}

export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + 'livv-bots-salt-v1')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
