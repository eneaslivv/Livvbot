do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenant_vertical') then
    create type public.tenant_vertical as enum
      ('ecommerce', 'restaurant', 'service', 'franchise', 'saas', 'general');
  end if;
end$$;

alter table public.tenants
  add column if not exists vertical public.tenant_vertical not null default 'ecommerce';

comment on column public.tenants.vertical is
  'Business type. Drives the bot prompt template + sync behavior. Default ecommerce keeps the historical behavior.';
