export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  message: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      // Low temperature: this is a grounded RAG bot — creativity here just
      // means inventing product details that aren't in the knowledge base.
      temperature: 0.2,
      max_tokens: 700,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`OpenAI chat error: ${res.status} ${errorBody}`)
  }

  const data = await res.json()
  return {
    message: data.choices[0].message.content,
    usage: data.usage,
  }
}

export async function createEmbedding(
  apiKey: string,
  text: string
): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`OpenAI embedding error: ${res.status} ${errorBody}`)
  }

  const data = await res.json()
  return data.data[0].embedding
}
