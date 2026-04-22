import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'
import { ArrowLeft, ArrowUpRight, Mail, Trash2, Power } from 'lucide-react'
import { Card, Field, Button, Alert, Badge } from '@/components/ui'

async function inviteUser(slug: string, formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  const role = String(formData.get('role') ?? 'member') as 'owner' | 'member'
  if (!email) return

  const tenant = await getTenantBySlug(slug)
  if (!tenant) return

  const admin = createAdminClient()

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) {
    redirect(`/admin/tenants/${slug}?error=${encodeURIComponent(listErr.message)}`)
  }
  const users = listData?.users ?? []
  let userId = users.find((u: any) => u.email === email)?.id

  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
    })
    if (error) {
      redirect(`/admin/tenants/${slug}?error=${encodeURIComponent(error.message)}`)
    }
    userId = data?.user?.id
  }

  if (!userId) return

  await admin
    .from('tenant_users')
    .upsert({ tenant_id: tenant.id, user_id: userId, role }, { onConflict: 'tenant_id,user_id' })

  revalidatePath(`/admin/tenants/${slug}`)
  redirect(`/admin/tenants/${slug}?invited=${encodeURIComponent(email)}`)
}

async function removeUser(slug: string, tenantUserId: string) {
  'use server'
  const admin = createAdminClient()
  await admin.from('tenant_users').delete().eq('id', tenantUserId)
  revalidatePath(`/admin/tenants/${slug}`)
}

async function toggleActive(slug: string, current: boolean) {
  'use server'
  const supabase = createClient()
  await supabase.from('tenants').update({ is_active: !current }).eq('slug', slug)
  revalidatePath(`/admin/tenants/${slug}`)
}

export default async function AdminTenantDetail({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { invited?: string; error?: string }
}) {
  const tenant = await getTenantBySlug(params.slug)
  if (!tenant) notFound()

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('tenant_users')
    .select('id, role, created_at, user_id')
    .eq('tenant_id', tenant.id)

  const { data: listData } = await admin.auth.admin.listUsers()
  const users = listData?.users ?? []
  const membersWithEmail = (members ?? []).map((m: any) => ({
    ...m,
    email: users.find((u: any) => u.id === m.user_id)?.email ?? '(unknown)',
  }))

  const initials = tenant.name
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <Link
        href="/admin/tenants"
        className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="w-3 h-3" /> All tenants
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-ink text-accent-fg flex items-center justify-center text-base font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
            <p className="text-sm text-ink-muted">/{tenant.slug}</p>
          </div>
          {!tenant.is_active && <Badge tone="warning">Inactive</Badge>}
        </div>
        <Link
          href={`/dashboard/${tenant.slug}`}
          className="flex items-center gap-1.5 text-xs font-medium bg-ink text-accent-fg px-3 py-2 rounded-lg hover:bg-ink-soft"
        >
          Open bot dashboard
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {searchParams.invited && <Alert tone="success">Invited {searchParams.invited}.</Alert>}
      {searchParams.error && <Alert tone="danger">{searchParams.error}</Alert>}

      <Card
        title={`Members (${membersWithEmail.length})`}
        description="Invite people to manage this tenant's bot. Owners can invite others; members can edit content."
      >
        <form
          action={inviteUser.bind(null, params.slug)}
          className="flex flex-col md:flex-row gap-2 mb-4 pb-4 border-b border-border"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="email@company.com"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40"
          />
          <select
            name="role"
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
          <Button type="submit" variant="primary">
            <Mail className="w-4 h-4" />
            Invite
          </Button>
        </form>

        {membersWithEmail.length === 0 ? (
          <p className="text-sm text-ink-muted py-2">
            No members yet. Invite someone above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {membersWithEmail.map((m: any) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {m.email[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.email}</div>
                  <div className="text-[11px] text-ink-muted uppercase tracking-wide">
                    {m.role}
                    {m.created_at && (
                      <>
                        <span className="mx-1">·</span>
                        Joined {new Date(m.created_at).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                <form action={removeUser.bind(null, params.slug, m.id)}>
                  <button
                    type="submit"
                    className="p-1.5 rounded-md text-ink-faint hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Danger zone">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              <Power className="w-4 h-4 text-ink-muted" />
              {tenant.is_active ? 'Tenant is active' : 'Tenant is inactive'}
            </div>
            <div className="text-xs text-ink-muted mt-1">
              Inactive tenants cannot serve chat requests — the endpoint returns 404.
            </div>
          </div>
          <form action={toggleActive.bind(null, params.slug, tenant.is_active)}>
            <Button
              type="submit"
              variant={tenant.is_active ? 'secondary' : 'primary'}
            >
              {tenant.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
