-- ============================================================================
-- LIVV Bots — Dashboard Auth & RLS
-- Multi-tenant dashboard: tenant_users pivot, LIVV admins, RLS policies
-- ============================================================================

-- ============================================================================
-- TENANT_USERS (auth.users ↔ tenants pivot)
-- ============================================================================

create type public.tenant_role as enum ('owner', 'member');

create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'member',
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

create index idx_tenant_users_user on public.tenant_users(user_id);
create index idx_tenant_users_tenant on public.tenant_users(tenant_id);

-- ============================================================================
-- LIVV_ADMINS (staff de LIVV Studio — superpoderes)
-- ============================================================================

create table public.livv_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- HELPER FUNCTIONS (security definer para usar dentro de policies sin recursion)
-- ============================================================================

create or replace function public.is_livv_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.livv_admins where user_id = auth.uid()
  );
$$;

create or replace function public.user_tenant_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.tenant_users where user_id = auth.uid();
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.tenant_users
    where user_id = auth.uid() and tenant_id = p_tenant_id
  );
$$;

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.tenant_users
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
      and role = 'owner'
  );
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ---- tenants ----
create policy "tenants_select_member"
  on public.tenants for select
  to authenticated
  using (public.is_tenant_member(id) or public.is_livv_admin());

create policy "tenants_update_owner"
  on public.tenants for update
  to authenticated
  using (public.is_tenant_owner(id) or public.is_livv_admin())
  with check (public.is_tenant_owner(id) or public.is_livv_admin());

create policy "tenants_insert_admin"
  on public.tenants for insert
  to authenticated
  with check (public.is_livv_admin());

create policy "tenants_delete_admin"
  on public.tenants for delete
  to authenticated
  using (public.is_livv_admin());

-- ---- tenant_users ----
alter table public.tenant_users enable row level security;

create policy "tenant_users_select_own"
  on public.tenant_users for select
  to authenticated
  using (user_id = auth.uid() or public.is_tenant_owner(tenant_id) or public.is_livv_admin());

create policy "tenant_users_insert_admin_or_owner"
  on public.tenant_users for insert
  to authenticated
  with check (public.is_tenant_owner(tenant_id) or public.is_livv_admin());

create policy "tenant_users_delete_admin_or_owner"
  on public.tenant_users for delete
  to authenticated
  using (public.is_tenant_owner(tenant_id) or public.is_livv_admin());

-- ---- livv_admins ----
alter table public.livv_admins enable row level security;

create policy "livv_admins_select_admin"
  on public.livv_admins for select
  to authenticated
  using (public.is_livv_admin());

-- (inserts/deletes en livv_admins solo desde service_role — no policy para auth role)

-- ---- products ----
create policy "products_select_member"
  on public.products for select
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin());

create policy "products_write_member"
  on public.products for all
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin())
  with check (public.is_tenant_member(tenant_id) or public.is_livv_admin());

-- ---- recipes ----
create policy "recipes_select_member"
  on public.recipes for select
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin());

create policy "recipes_write_member"
  on public.recipes for all
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin())
  with check (public.is_tenant_member(tenant_id) or public.is_livv_admin());

-- ---- faqs ----
create policy "faqs_select_member"
  on public.faqs for select
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin());

create policy "faqs_write_member"
  on public.faqs for all
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin())
  with check (public.is_tenant_member(tenant_id) or public.is_livv_admin());

-- ---- conversations (read-only para miembros del tenant) ----
create policy "conversations_select_member"
  on public.conversations for select
  to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_livv_admin());

-- (writes en conversations solo desde service_role en la edge function)

-- ---- rate_limits (solo service_role) ----
-- no policies, lo escribe el edge function con service_role

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

insert into storage.buckets (id, name, public)
  values ('widgets', 'widgets', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('tenant-assets', 'tenant-assets', true)
  on conflict (id) do nothing;

-- Storage policies: tenant-assets (cada tenant escribe en su carpeta)
create policy "tenant_assets_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'tenant-assets');

create policy "tenant_assets_member_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tenant-assets'
    and (
      public.is_livv_admin()
      or (
        -- Path convention: <tenant_slug>/...
        split_part(name, '/', 1) in (
          select t.slug from public.tenants t
          where public.is_tenant_member(t.id)
        )
      )
    )
  );

create policy "tenant_assets_member_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tenant-assets'
    and (
      public.is_livv_admin()
      or split_part(name, '/', 1) in (
        select t.slug from public.tenants t
        where public.is_tenant_member(t.id)
      )
    )
  );

create policy "tenant_assets_member_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tenant-assets'
    and (
      public.is_livv_admin()
      or split_part(name, '/', 1) in (
        select t.slug from public.tenants t
        where public.is_tenant_member(t.id)
      )
    )
  );

-- widgets bucket: solo LIVV admins escriben, público lee
create policy "widgets_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'widgets');

create policy "widgets_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'widgets' and public.is_livv_admin());

create policy "widgets_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'widgets' and public.is_livv_admin());
