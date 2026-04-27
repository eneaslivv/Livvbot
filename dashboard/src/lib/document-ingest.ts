// Extract text from uploaded files, chunk it, embed each chunk, and insert.

import { createClient } from '@/lib/supabase/server'

export interface IngestResult {
  ok: boolean
  error?: string
  documentId?: string
  title: string
  chunksCreated: number
  sizeBytes: number
  sourceType: string
}

const MAX_CHUNK_CHARS = 1400
const CHUNK_OVERLAP_CHARS: number = 200

// Very small splitter: prefer paragraph boundaries, fall back to sentence, then char-count.
export function chunkText(text: string): string[] {
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
  if (!clean) return []
  if (clean.length <= MAX_CHUNK_CHARS) return [clean]

  const paragraphs = clean.split(/\n\n+/)
  const chunks: string[] = []
  let buf = ''
  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim())
    buf = ''
  }

  for (const p of paragraphs) {
    if (p.length > MAX_CHUNK_CHARS) {
      flush()
      // Split long paragraph by sentence
      const sentences = p.split(/(?<=[.!?])\s+/)
      for (const s of sentences) {
        if ((buf + ' ' + s).length > MAX_CHUNK_CHARS) {
          flush()
        }
        buf += (buf ? ' ' : '') + s
      }
      flush()
    } else if ((buf + '\n\n' + p).length > MAX_CHUNK_CHARS) {
      flush()
      buf = p
    } else {
      buf += (buf ? '\n\n' : '') + p
    }
  }
  flush()

  // Add overlap: prepend the tail of the previous chunk to the next (helps retrieval context)
  if (chunks.length <= 1 || CHUNK_OVERLAP_CHARS === 0) return chunks
  return chunks.map((c, i) => {
    if (i === 0) return c
    const prevTail = chunks[i - 1].slice(-CHUNK_OVERLAP_CHARS)
    return `...${prevTail}\n\n${c}`
  })
}

async function embedBatch(apiKey: string, texts: string[]): Promise<number[][]> {
  // OpenAI supports up to 2048 inputs per request; we batch to be safe
  const BATCH = 32
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: slice }),
    })
    if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`)
    const data = await res.json()
    for (const row of data.data) out.push(row.embedding)
  }
  return out
}

export async function extractFromFile(file: File): Promise<{ text: string; sourceType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    // Use pdf-parse (CommonJS module, dynamic import)
    // @ts-ignore
    const pdfParse = (await import('pdf-parse')).default as any
    const data = await pdfParse(buffer)
    return { text: String(data.text ?? ''), sourceType: 'pdf' }
  }

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return { text: buffer.toString('utf-8'), sourceType: name.endsWith('.md') ? 'md' : 'txt' }
  }

  throw new Error(`Unsupported file type: ${file.name}. Supported: .pdf, .txt, .md`)
}

export async function ingestFileForTenant(
  slug: string,
  file: File
): Promise<IngestResult> {
  const supabase = createClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, openai_api_key_encrypted')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return {
      ok: false,
      error: 'tenant not found',
      title: file.name,
      chunksCreated: 0,
      sizeBytes: file.size,
      sourceType: '',
    }
  }

  const apiKey = tenant.openai_api_key_encrypted as string | null
  if (!apiKey) {
    return {
      ok: false,
      error: 'no OpenAI key configured for this tenant',
      title: file.name,
      chunksCreated: 0,
      sizeBytes: file.size,
      sourceType: '',
    }
  }

  try {
    const { text, sourceType } = await extractFromFile(file)
    if (!text || text.trim().length < 50) {
      throw new Error('document had too little extractable text')
    }

    const chunks = chunkText(text)
    if (chunks.length === 0) {
      throw new Error('chunker produced 0 chunks')
    }

    // Create document row
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenant.id,
        title: file.name.replace(/\.(pdf|txt|md)$/i, ''),
        source_type: sourceType,
        original_filename: file.name,
        file_size_bytes: file.size,
        chunk_count: chunks.length,
      })
      .select('id')
      .single()

    if (docErr || !doc) {
      throw new Error(`failed to create document row: ${docErr?.message}`)
    }

    // Embed all chunks in batches + insert
    const embeddings = await embedBatch(apiKey, chunks)

    const rows = chunks.map((content, i) => ({
      tenant_id: tenant.id,
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }))

    const { error: insertErr } = await supabase.from('document_chunks').insert(rows)
    if (insertErr) {
      throw new Error(`failed to insert chunks: ${insertErr.message}`)
    }

    return {
      ok: true,
      documentId: doc.id,
      title: file.name.replace(/\.(pdf|txt|md)$/i, ''),
      chunksCreated: chunks.length,
      sizeBytes: file.size,
      sourceType,
    }
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message,
      title: file.name,
      chunksCreated: 0,
      sizeBytes: file.size,
      sourceType: '',
    }
  }
}
