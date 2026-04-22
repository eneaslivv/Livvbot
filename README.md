# LIVV Bots

Multi-tenant AI chatbot platform for LIVV Studio clients. Each client (tenant) gets their own isolated knowledge base, system prompt, branded widget, and a self-service dashboard to manage it all.

## Stack

- **DB & Auth:** Supabase (Postgres + pgvector + Auth)
- **Chat runtime:** Supabase Edge Function (`/chat`)
- **Widget:** Vite + React — a single `widget.iife.js` embeddable anywhere
- **Dashboard:** Next.js 14 App Router + Tailwind

## Infra (already provisioned)

- Supabase project: `livv-bots` (ref: `hlycvssnnctrudywchxo`)
- API URL: `https://hlycvssnnctrudywchxo.supabase.co`
- Edge Function `chat` deployed
- Migrations applied (schema + RLS)

## Repo layout

```
livv-bots/
├── supabase/
│   ├── migrations/          — DDL (schema + RLS)
│   └── functions/chat/      — Deno edge function
├── widget/                  — Vite widget (bundles to widget.iife.js)
├── dashboard/               — Next.js admin/tenant app
├── scripts/                 — Node CLIs (bootstrap-admin, ingest, create-tenant)
└── seed/kru/                — KRU seed data (tenant + products + FAQs + recipes)
```

## Initial setup

### 1. Env files

Copy `.env.example` → `.env` at root and fill in the Supabase **service_role** key (from Dashboard → Settings → API). Do the same for `dashboard/.env.local`.

### 2. Install

```bash
pnpm install                            # at root (installs all workspaces)
cd dashboard && pnpm install            # if not in a workspace yet
```

### 3. Bootstrap the first LIVV admin

Only needed once — makes your account a superuser in the platform.

```bash
cd scripts
pnpm bootstrap-admin you@livvvv.com
```

This sends you a magic link and marks you as a LIVV admin. After login you'll see the `/admin` area.

### 4. Run the dashboard

```bash
cd dashboard
pnpm dev   # http://localhost:3000
```

Log in, then go to `/admin/tenants/new` to create your first tenant. Or seed KRU directly (below).

### 5. Seed KRU (optional — can also do it via dashboard)

```bash
cd scripts
pnpm create-tenant ../seed/kru/tenant.json
pnpm ingest kru ../seed/kru
```

Edit `seed/kru/tenant.json` first to put Wendell's OpenAI key in `openai_api_key_encrypted`.

### 6. Build & upload the widget

```bash
cd widget
pnpm install
pnpm build
# Upload dist/widget.iife.js to the 'widgets' storage bucket in Supabase.
# Public URL: https://hlycvssnnctrudywchxo.supabase.co/storage/v1/object/public/widgets/widget.iife.js
```

## Embed snippet

The dashboard generates a per-tenant snippet on the **Embed** tab, ready to paste before `</body>`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm bootstrap-admin <email>` | Make a user a LIVV admin (first-time only) |
| `pnpm create-tenant <tenant.json>` | Create/update a tenant from JSON |
| `pnpm ingest <slug> <seed-dir>` | Embed + insert products/recipes/FAQs |

## Current tenants

- `kru` — KRU Food (Wendell Worjroh)
