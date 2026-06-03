-- Lead capture: structured email/phone/name extracted from chat
alter table public.conversations
  add column if not exists lead_data jsonb not null default '{}'::jsonb,
  add column if not exists human_status text not null default 'open'
    check (human_status in ('open', 'claimed', 'resolved')),
  add column if not exists claimed_by uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists resolved_at timestamptz;

comment on column public.conversations.lead_data is
  'Auto-extracted contact info from visitor messages: {email, phone, captured_at, source}';
comment on column public.conversations.human_status is
  'open = bot only; claimed = human took over; resolved = handled';

create index if not exists idx_conv_lead_email on public.conversations((lead_data->>'email'))
  where lead_data ? 'email';
create index if not exists idx_conv_handoff_active on public.conversations(tenant_id, updated_at desc)
  where handoff_triggered and human_status <> 'resolved';
