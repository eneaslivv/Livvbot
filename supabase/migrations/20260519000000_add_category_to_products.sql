alter table public.products
  add column if not exists category text;

comment on column public.products.category is
  'Storefront category slug (e.g. "sauces", "spices"). Used by widget to build product URLs like /shop/{category}/{handle}.';

create index if not exists idx_products_category on public.products(tenant_id, category);
