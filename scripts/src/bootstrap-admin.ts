import { supabase } from './lib/supabase.js'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: pnpm bootstrap-admin <email>')
    console.error('Example: pnpm bootstrap-admin you@livvvv.com')
    console.error('')
    console.error('This will:')
    console.error('  1. Send a magic link invite to the email (or reuse an existing user)')
    console.error('  2. Mark that user as a LIVV admin in public.livv_admins')
    process.exit(1)
  }

  console.log(`→ Bootstrapping admin: ${email}`)

  // 1. Find or invite the user
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Failed to list users:', listErr)
    process.exit(1)
  }

  let user = users.find((u: any) => u.email === email)

  if (!user) {
    console.log('  User does not exist — sending invite...')
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)
    if (error) {
      console.error('Invite failed:', error)
      process.exit(1)
    }
    user = data.user ?? undefined
  } else {
    console.log('  User already exists, id:', user.id)
  }

  if (!user) {
    console.error('Could not resolve user')
    process.exit(1)
  }

  // 2. Insert into livv_admins
  const { error: adminErr } = await supabase
    .from('livv_admins')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' })

  if (adminErr) {
    console.error('Failed to mark as admin:', adminErr)
    process.exit(1)
  }

  console.log(`✓ ${email} is now a LIVV admin`)
  console.log('')
  console.log('Next steps:')
  console.log('  - Check inbox for the magic link (if new user)')
  console.log('  - Log in at your dashboard URL')
  console.log('  - Create tenants from /admin/tenants')
}

main()
