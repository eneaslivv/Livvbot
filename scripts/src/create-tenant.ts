import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { supabase } from './lib/supabase.js'

async function main() {
  const tenantPath = process.argv[2]
  if (!tenantPath) {
    console.error('Usage: pnpm create-tenant <path-to-tenant.json>')
    process.exit(1)
  }

  const tenantData = JSON.parse(readFileSync(resolve(tenantPath), 'utf-8'))

  const { data, error } = await supabase
    .from('tenants')
    .upsert(tenantData, { onConflict: 'slug' })
    .select()
    .single()

  if (error) {
    console.error('Error creating tenant:', error)
    process.exit(1)
  }

  console.log(`✓ Tenant created/updated: ${data.slug} (id: ${data.id})`)
}

main()
