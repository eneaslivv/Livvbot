alter table public.products
  add column if not exists image_url text;

comment on column public.products.image_url is
  'Hero image URL, used by product cards in the chat widget.';
