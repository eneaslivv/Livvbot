import { getTenantBySlug } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import { CopyBlock } from '@/components/CopyBlock'
import { Check, X } from 'lucide-react'

export default async function EmbedPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://hlycvssnnctrudywchxo.supabase.co'
  const widgetUrl = `${supabaseUrl}/storage/v1/object/public/widgets/widget.iife.js`
  const bc = tenant.brand_config ?? {}

  const quickActionsJson = JSON.stringify(tenant.quick_actions ?? [], null, 8)
    .replace(/^/gm, '      ')
    .trim()

  const snippet = `<!-- LIVV Bots — ${bc.botName ?? tenant.name} for ${tenant.name} -->
<script src="${widgetUrl}" defer></script>
<script>
  window.addEventListener('load', function () {
    // Product context is auto-detected for Shopify; widget also auto-captures
    // cart, journey and search query. No extra config needed.
    var productContext = window.ShopifyAnalytics?.meta?.product
      ? {
          handle: window.ShopifyAnalytics.meta.product.handle,
          name: window.ShopifyAnalytics.meta.product.variants?.[0]?.name,
        }
      : undefined;

    window.LivvBots.init({
      tenantSlug: '${tenant.slug}',
      apiUrl: '${supabaseUrl}',
      brand: {
        botName: ${JSON.stringify(bc.botName ?? 'Assistant')},
        mascotUrl: ${JSON.stringify(bc.mascotUrl ?? '')},
        primaryColor: ${JSON.stringify(bc.primaryColor ?? '#1a1a1a')},
        accentColor: ${JSON.stringify(bc.accentColor ?? '#d4a017')},
        greeting: ${JSON.stringify(bc.greeting ?? 'Hi! How can I help?')},
        placeholder: ${JSON.stringify(bc.placeholder ?? 'Ask me anything...')},
      },
      quickActions: ${quickActionsJson},
      productContext: productContext,
    });
  });
</script>`

  const hasKey = Boolean(tenant.openai_api_key_encrypted)
  const hasOrigins = (tenant.allowed_origins?.length ?? 0) > 0
  const readyChecks = [
    { label: 'OpenAI key set', ok: hasKey },
    { label: 'Allowed origins configured', ok: hasOrigins },
    { label: 'Tenant active', ok: tenant.is_active },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Install on your site</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Paste this before <code className="font-mono text-[11px] bg-surface-sunken px-1 rounded">&lt;/body&gt;</code>. The bot will appear bottom-right.
          </p>
        </div>
        <CopyBlock code={snippet} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-3">Readiness</h3>
          <ul className="space-y-2">
            {readyChecks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    c.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                </div>
                <span className={c.ok ? 'text-ink' : 'text-ink-soft'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-3">Allowed origins</h3>
          {tenant.allowed_origins?.length ? (
            <ul className="space-y-1">
              {tenant.allowed_origins.map((o: string) => (
                <li
                  key={o}
                  className="text-xs font-mono bg-surface-sunken px-2 py-1.5 rounded border border-border"
                >
                  {o}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">
              No origins set. The bot won't respond on any site until you add at least one.
            </p>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        <strong>Tip:</strong> for Shopify, paste the snippet in{' '}
        <code className="font-mono text-xs">theme.liquid</code> before{' '}
        <code className="font-mono text-xs">&lt;/body&gt;</code>. For Framer/Webflow, use a custom
        code injection at page-end.
      </div>
    </div>
  )
}
