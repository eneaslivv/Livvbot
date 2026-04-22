export function buildCorsHeaders(origin: string | null, allowedOrigins: string[]) {
  const isAllowed = origin && allowedOrigins.some(allowed => {
    // Permite coincidencia exacta o subdominio
    return origin === allowed || origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`)
  })

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-Slug',
    'Access-Control-Max-Age': '86400',
  }
}
