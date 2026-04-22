-- ============================================================================
-- LIVV Bots — Initial Schema
-- ============================================================================

-- Extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ============================================================================
-- TENANTS
-- ============================================================================

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand_config jsonb not null default '{}'::jsonb,
  system_prompt text not null,
  openai_api_key_encrypted text,
  openai_model text not null default 'gpt-4o-mini',
  fallback_email text,
  allowed_origins text[] not null default array[]::text[],
  handoff_keywords text[] not null default array[]::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.tenants.brand_config is
  'JSON: { botName, mascotUrl, primaryColor, accentColor, greeting, placeholder }';
comment on column public.tenants.allowed_origins is
  'CORS whitelist: ["https://crewful.com", "https://www.crewful.com"]';
comment on column public.tenants.handoff_keywords is
  'Keywords que disparan derivación a email: ["order", "refund", "shipping"]';

-- ============================================================================
-- KNOWLEDGE BASE
-- ============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  external_id text,
  handle text,
  name text not null,
  description text,
  usage_notes text,
  metadata jsonb not null default '{}'::jsonb,
  tags text[] not null default array[]::text[],
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, handle)
);

create index idx_products_tenant on public.products(tenant_id);
create index idx_products_embedding on public.products
  using hnsw (embedding vector_cosine_ops);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  ingredients text,
  steps text,
  related_product_ids uuid[] not null default array[]::uuid[],
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index idx_recipes_tenant on public.recipes(tenant_id);
create index idx_recipes_embedding on public.recipes
  using hnsw (embedding vector_cosine_ops);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category text,
  question text not null,
  answer text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index idx_faqs_tenant on public.faqs(tenant_id);
create index idx_faqs_embedding on public.faqs
  using hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id text not null,
  product_context jsonb,
  messages jsonb not null default '[]'::jsonb,
  handoff_triggered boolean not null default false,
  handoff_reason text,
  token_usage jsonb not null default '{}'::jsonb,
  user_ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_tenant_session on public.conversations(tenant_id, session_id);
create index idx_conversations_created on public.conversations(created_at desc);

-- ============================================================================
-- RATE LIMITS
-- ============================================================================

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  ip_hash text not null,
  window_start timestamptz not null,
  request_count int not null default 1,
  unique(tenant_id, ip_hash, window_start)
);

create index idx_rate_limits_cleanup on public.rate_limits(window_start);

-- ============================================================================
-- VECTOR SEARCH FUNCTION
-- ============================================================================

create or replace function public.match_knowledge(
  p_tenant_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 5,
  p_similarity_threshold float default 0.3
)
returns table (
  source_type text,
  source_id uuid,
  title text,
  content text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  with combined as (
    select
      'product'::text as source_type,
      p.id as source_id,
      p.name as title,
      p.name || E'\n' || coalesce(p.description, '') || E'\n' || coalesce(p.usage_notes, '') as content,
      1 - (p.embedding <=> p_query_embedding) as similarity
    from public.products p
    where p.tenant_id = p_tenant_id
      and p.embedding is not null

    union all

    select
      'recipe'::text,
      r.id,
      r.title,
      r.title || E'\n' || coalesce(r.description, '') || E'\n' || coalesce(r.steps, ''),
      1 - (r.embedding <=> p_query_embedding)
    from public.recipes r
    where r.tenant_id = p_tenant_id
      and r.embedding is not null

    union all

    select
      'faq'::text,
      f.id,
      f.question,
      f.question || E'\n' || f.answer,
      1 - (f.embedding <=> p_query_embedding)
    from public.faqs f
    where f.tenant_id = p_tenant_id
      and f.embedding is not null
  )
  select c.source_type, c.source_id, c.title, c.content, c.similarity
  from combined c
  where c.similarity >= p_similarity_threshold
  order by c.similarity desc
  limit p_match_count;
end;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS (todo lo serio va vía service_role desde Edge Functions)
-- ============================================================================

alter table public.tenants enable row level security;
alter table public.products enable row level security;
alter table public.recipes enable row level security;
alter table public.faqs enable row level security;
alter table public.conversations enable row level security;
alter table public.rate_limits enable row level security;

-- No se exponen policies al anon key. Todo el acceso es desde Edge Functions
-- con service_role key. Las policies de dashboard se agregan en una migration
-- futura cuando implementemos auth de staff de LIVV.
