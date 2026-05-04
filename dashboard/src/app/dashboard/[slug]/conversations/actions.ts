'use server'

import { createClient } from '@/lib/supabase/server'
import { embedText } from '@/lib/embeddings'
import { revalidatePath } from 'next/cache'

async function loadTenant(slug: string) {
  const supabase = createClient()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, openai_api_key_encrypted')
    .eq('slug', slug)
    .single()
  if (error || !tenant) throw new Error('tenant not found')
  return { supabase, tenant }
}

export async function addCorrection(
  slug: string,
  input: {
    userQuery: string
    originalMessage: string
    correctedMessage: string
    reason?: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userQuery = input.userQuery.trim()
    const corrected = input.correctedMessage.trim()
    if (!userQuery) return { ok: false, error: 'user query is empty' }
    if (!corrected) return { ok: false, error: 'corrected reply is empty' }

    const { supabase, tenant } = await loadTenant(slug)
    if (!tenant.openai_api_key_encrypted) {
      return { ok: false, error: 'tenant has no OpenAI key configured' }
    }

    const embedding = await embedText(tenant.openai_api_key_encrypted, userQuery)

    const { error } = await supabase.from('corrections').insert({
      tenant_id: tenant.id,
      user_query: userQuery,
      original_message: input.originalMessage || null,
      corrected_message: corrected,
      reason: input.reason?.trim() || null,
      embedding,
    })
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/dashboard/${slug}/conversations`)
    revalidatePath(`/dashboard/${slug}/settings`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function archiveCorrection(
  slug: string,
  correctionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('corrections')
    .update({ archived: true })
    .eq('id', correctionId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/dashboard/${slug}/settings`)
  return { ok: true }
}

export async function submitFeedback(
  slug: string,
  input: {
    conversationId: string
    messageIndex: number
    rating: 1 | -1
    note?: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, tenant } = await loadTenant(slug)

    // Upsert by (conversation_id, message_index, created_by).
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id ?? null

    // Check existing first so we can toggle off if the user clicks the same rating twice.
    const { data: existing } = await supabase
      .from('message_feedback')
      .select('id, rating')
      .eq('conversation_id', input.conversationId)
      .eq('message_index', input.messageIndex)
      .eq('created_by', userId ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle()

    if (existing && existing.rating === input.rating) {
      // Toggle off
      const { error } = await supabase
        .from('message_feedback')
        .delete()
        .eq('id', existing.id)
      if (error) return { ok: false, error: error.message }
    } else if (existing) {
      const { error } = await supabase
        .from('message_feedback')
        .update({ rating: input.rating, note: input.note ?? null })
        .eq('id', existing.id)
      if (error) return { ok: false, error: error.message }
    } else {
      const { error } = await supabase.from('message_feedback').insert({
        tenant_id: tenant.id,
        conversation_id: input.conversationId,
        message_index: input.messageIndex,
        rating: input.rating,
        note: input.note ?? null,
        created_by: userId,
      })
      if (error) return { ok: false, error: error.message }
    }

    revalidatePath(`/dashboard/${slug}/conversations`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
