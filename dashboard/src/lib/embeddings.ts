// Server-side OpenAI embedding helper. Mirrors what the edge function does
// in supabase/functions/_shared/openai.ts so retrieval matches exactly.

export async function embedText(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI embedding error: ${res.status} ${body}`)
  }
  const data = await res.json()
  return data.data[0].embedding
}
