import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
}

// Los datos de LIVV Bots viven en el schema `bots` del proyecto central
export const supabase = createClient(url, key, { db: { schema: 'bots' } })
