import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { TenantHeader } from '@/components/TenantHeader'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <TenantHeader tenant={tenant} />
      <div className="flex-1 px-8 py-6">
        <div className="max-w-5xl">{children}</div>
      </div>
    </div>
  )
}
