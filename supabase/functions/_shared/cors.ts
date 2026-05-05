// CORS / origin matching for the chat edge function.
//
// Supports three entry forms in tenant.allowed_origins:
//   1. Exact origin           "https://kru.com"          → matches only that.
//   2. Bare host              "kru.com"                  → matches the host.
//   3. Wildcard subdomain     "*.lovable.app"            → matches any
//                                                          subdomain of
//                                                          lovable.app (one
//                                                          or more labels).
//   4. Catch-all              "*"                        → matches anything.
//
// `COMMON_PLATFORM_ORIGINS_DEFAULT` is what we seed on every new tenant so
// the bot "just works" when pasted on the platforms our customers actually
// use. Tenants can still tighten the list manually in Settings.

export const COMMON_PLATFORM_ORIGINS_DEFAULT = [
  '*.lovable.app',
  '*.lovable.dev',
  '*.myshopify.com',
  '*.shopify.com',
  '*.shopifypreview.com',
  '*.webflow.io',
  '*.framer.app',
  '*.framer.website',
  '*.vercel.app',
  '*.netlify.app',
  '*.wixsite.com',
  '*.wix.com',
  '*.squarespace.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:4321',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

function normalizeHost(s: string): string {
  return s.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
}

export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  // No Origin header (server-side / curl / native app): allow.
  if (!origin) return true

  // Catch-all opt-in for tenants who want zero gating.
  if (allowedOrigins.includes('*')) return true

  const originHost = normalizeHost(origin)

  for (const entry of allowedOrigins) {
    if (!entry) continue
    const normalized = normalizeHost(entry)

    // Exact match (with or without protocol)
    if (origin === entry) return true
    if (originHost === normalized) return true

    // Wildcard subdomain: "*.example.com" matches "sub.example.com",
    // "a.b.example.com", but NOT "example.com" itself.
    if (normalized.startsWith('*.')) {
      const suffix = normalized.slice(1) // ".example.com"
      if (originHost.endsWith(suffix) && originHost.length > suffix.length) {
        return true
      }
    } else {
      // Bare-host fallback: "example.com" also matches subdomains
      // ("sub.example.com", "a.b.example.com"). Mirrors how the old
      // code worked, so manually-added entries keep behaving the same.
      if (originHost.endsWith('.' + normalized)) return true
    }
  }
  return false
}

export function buildCorsHeaders(
  origin: string | null,
  allowedOrigins: string[]
) {
  const allowed = isOriginAllowed(origin, allowedOrigins)
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : (allowedOrigins[0] ?? '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-Slug',
    'Access-Control-Max-Age': '86400',
  }
}
