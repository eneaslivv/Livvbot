import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { supabase } from './lib/supabase.js'
import { createEmbedding } from './lib/embeddings.js'

async function main() {
  const tenantSlug = process.argv[2]
  const seedDir = process.argv[3]

  if (!tenantSlug || !seedDir) {
    console.error('Usage: pnpm ingest <tenant-slug> <seed-dir>')
    console.error('Example: pnpm ingest kru ./seed/kru')
    process.exit(1)
  }

  // 1. Fetch tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', tenantSlug)
    .single()

  if (tenantError || !tenant) {
    console.error(`Tenant not found: ${tenantSlug}. Create it first with create-tenant.`)
    process.exit(1)
  }

  console.log(`→ Ingesting for tenant: ${tenant.slug}`)

  const basePath = resolve(seedDir)

  // 2. Products
  await ingestCollection({
    tenantId: tenant.id,
    filePath: `${basePath}/products.json`,
    table: 'products',
    buildEmbeddingText: (row: any) =>
      `${row.name}\n${row.description ?? ''}\n${row.usage_notes ?? ''}`,
  })

  // 3. Recipes
  await ingestCollection({
    tenantId: tenant.id,
    filePath: `${basePath}/recipes.json`,
    table: 'recipes',
    buildEmbeddingText: (row: any) =>
      `${row.title}\n${row.description ?? ''}\n${row.ingredients ?? ''}\n${row.steps ?? ''}`,
  })

  // 4. FAQs
  await ingestCollection({
    tenantId: tenant.id,
    filePath: `${basePath}/faqs.json`,
    table: 'faqs',
    buildEmbeddingText: (row: any) =>
      `${row.question}\n${row.answer}`,
  })

  console.log('✓ Ingest complete')
}

async function ingestCollection({
  tenantId,
  filePath,
  table,
  buildEmbeddingText,
}: {
  tenantId: string
  filePath: string
  table: string
  buildEmbeddingText: (row: any) => string
}) {
  let raw: string
  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch {
    console.warn(`  ⚠ Skipping ${table}: ${filePath} not found`)
    return
  }

  const rows = JSON.parse(raw)
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(`  ⚠ Skipping ${table}: empty or invalid`)
    return
  }

  console.log(`  → ${table}: ${rows.length} rows`)

  for (const row of rows) {
    const text = buildEmbeddingText(row)
    const embedding = await createEmbedding(text)

    const payload = { ...row, tenant_id: tenantId, embedding }

    const { error } = await supabase.from(table).upsert(payload)
    if (error) {
      console.error(`    ✗ Error inserting row:`, error.message)
    } else {
      console.log(`    ✓ ${row.name ?? row.title ?? row.question}`)
    }
  }
}

main()
