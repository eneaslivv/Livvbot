import { getCurrentUser, getUserTenants, isLivvAdmin } from '@/lib/tenant'
import { Sidebar } from '@/components/Sidebar'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const admin = await isLivvAdmin()
  if (!admin) redirect('/dashboard')

  const tenants = await getUserTenants()

  return (
    <div className="flex min-h-screen">
      <Sidebar tenants={tenants as any} userEmail={user.email ?? ''} isAdmin={admin} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
