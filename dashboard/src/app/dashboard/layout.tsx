import { getCurrentUser, getUserTenants, isLivvAdmin } from '@/lib/tenant'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const tenants = await getUserTenants()
  const admin = await isLivvAdmin()

  return (
    <div className="flex min-h-screen">
      <Sidebar tenants={tenants as any} userEmail={user.email ?? ''} isAdmin={admin} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
