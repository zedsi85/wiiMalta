# Wii Malta — Event OS

> Malta After Dark. The Wii Malta monorepo: cinematic marketing site today,
> full event platform (ticketing, wallet, check-in, ambassadors, admin, mobile)
> as it ships.

## Layout

```
apps/
  web/          Next.js — marketing site + web platform
                  app/(marketing)/  cinematic experience (/, about, community, partners, team)
                  app/(platform)/   events, checkout — future: account, tickets, ambassador
packages/
  ui/           Design system — TS tokens + Tailwind preset (@wii/ui)
  core/         Domain logic — money (cents), state machines (@wii/core)
  db/           Drizzle schema for Postgres (@wii/db) — migrations start Phase 1
docs/
  architecture/ Event OS design docs: state machines, checkout flow
```

## Run

```bash
npm install
npm run dev        # next dev (apps/web) @ http://localhost:3000
npm run build      # build all workspaces
npm run typecheck  # tsc across all workspaces
npm run lint
```

Node ≥ 18.18 (pinned to 22 via `.nvmrc`). npm workspaces (plain scripts — Turborepo can come back when workspace count justifies build caching).

## Deploy (Vercel)

Set the project **Root Directory** to `apps/web` (Vercel auto-detects Next.js
and runs the install at the repo root for workspaces). Optional env:
`NEXT_PUBLIC_SITE_URL` pins the canonical/OG origin (see apps/web/.env.example).

## Architecture

The platform build-out is specified in [docs/architecture](docs/architecture):
[state machines](docs/architecture/state-machines.md) ·
[checkout flow](docs/architecture/checkout-flow.md) ·
schema at [packages/db/src/schema.ts](packages/db/src/schema.ts).

Phase roadmap: **0** monorepo foundation (this) → **1** real data (Postgres +
admin CRUD) → **2** money (auth, Stripe, tickets) → **3** operations (check-in,
ambassadors) → **4** mobile (Expo).

The web app's own docs (routes, design tokens, notes for extending) are in
[apps/web/README.md](apps/web/README.md).
