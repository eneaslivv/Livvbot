-- ============================================================================
-- Bot personality (structured rules) + RLHF-lite corrections + message feedback
-- ============================================================================

-- ---- 1. Structured personality rules on tenants ---------------------------

alter table public.tenants
  add column if not exists bot_rules jsonb not null default '{}'::jsonb;

comment on column public.tenants.bot_rules is
  'JSON: { dos: string[], donts: string[], sales_focus: text, external_topic_policy: text }';

-- ---- 2. Corrections (RLHF-lite via retrieval) -----------------------------

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_query text not null,
  original_message text,
  corrected_message text not null,
  reason text,
  embedding vector(1536),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index idx_corrections_tenant on public.corrections(tenant_id);
create index idx_corrections_embedding on public.corrections
  using hnsw (embedding vector_cosine_ops);

alter table public.corrections enable row level security;

create policy "corrections_select_member"
  on public.corrections for select
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin());

create policy "corrections_write_member"
  on public.corrections for all
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin())
  with check (public.is_tenant_member(tenant_id) or public.is_livv_admin());

create or replace function public.match_corrections(
  p_tenant_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 3,
  p_similarity_threshold float default 0.7
)
returns table (
  id uuid,
  user_query text,
  original_message text,
  corrected_message text,
  reason text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    c.id,
    c.user_query,
    c.original_message,
    c.corrected_message,
    c.reason,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.corrections c
  where c.tenant_id = p_tenant_id
    and c.archived = false
    and c.embedding is not null
    and (1 - (c.embedding <=> p_query_embedding)) >= p_similarity_threshold
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

-- ---- 3. Message feedback (thumbs) -----------------------------------------

create table public.message_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_index int not null,
  rating smallint not null check (rating in (-1, 1)),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(conversation_id, message_index, created_by)
);

create index idx_message_feedback_tenant on public.message_feedback(tenant_id);
create index idx_message_feedback_conv on public.message_feedback(conversation_id);

alter table public.message_feedback enable row level security;

create policy "feedback_select_member"
  on public.message_feedback for select
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin());

create policy "feedback_write_member"
  on public.message_feedback for all
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin())
  with check (public.is_tenant_member(tenant_id) or public.is_livv_admin());
