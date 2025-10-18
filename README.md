# ALL IN Poker MVP

Modern Next.js 15 + TypeScript app with tRPC, Drizzle ORM, Supabase Realtime, and a structured logging stack designed for observability.

## Tech stack
- Next.js App Router (React 19)
- TypeScript
- tRPC v11 (server + React Query)
- Drizzle ORM (Postgres)
- Supabase (Auth + Realtime)
- Tailwind (shadcn/ui)
- Vitest + Testing Library
- Pino (structured logs)

## Getting started
1) Install deps
```bash
pnpm install
```
2) Configure environment (see below)
3) Run dev server
```bash
pnpm dev
```

## Environment variables
Create `.env.local` with at least:
```env
DATABASE_URL=postgres://user:pass@localhost:5432/db
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database
- ORM: Drizzle
- Generate migrations: prefer code-first schema; only generate when needed.
```bash
pnpm db:generate --custom --name <migration-name>
pnpm db:migrate
```
- Push changes (dev):
```bash
pnpm db:push
```

See `DB_SETUP.md` for local DB setup.

## Supabase
- Browser client: `src/supabase/client.ts`
- Server client: `src/supabase/server.ts`
- Middleware guards routes and supports dev impersonation.

## tRPC
- Server context: `src/trpc/init.ts` (includes `user`, `supabase`, and request-scoped `log`)
- Routers: `src/trpc/routers/*`
- API route adapter: `src/app/api/trpc/[trpc]/route.ts`
- Client: `src/trpc/client.tsx` (React Query + logger link)

## Logging
Structured logging via Pino with request context.

- Server/browser logger: `import { logger } from "@/logger"`
- Request-scoped logger: `import { getLoggerWithRequest } from "@/logger/request-context"`
- Edge-safe logger (middleware): `import { edgeLogger } from "@/logger/edge"`

Example:
```ts
import { logger } from "@/logger";
const log = logger.with({ component: "ActionPanel" });
log.info({ playerId, action }, "player.action");
```

On server procedures/routes:
```ts
// tRPC resolver
opts.ctx.log.info({ gameId }, "game.join");

// API route
import { getLoggerWithRequest } from "@/logger/request-context";
getLoggerWithRequest().error({ error }, "admin.setUserRole_error");
```

Tracing
- Each request gets `x-request-id` in responses and logs. Middleware and tRPC add it automatically.
- Dev: pretty logs. Prod: NDJSON suitable for log shipper ingestion.

## Dev tools
- Dev panels under `src/components/dev/*` (guards apply in prod)
- Realtime diagnostics: `src/supabase/realtimeStatus.ts`

## Scripts
- `pnpm dev` – start app
- `pnpm build` – typecheck, lint, build
- `pnpm test` – run unit tests
- `pnpm db:*` – manage database (Drizzle)

## Conventions
- Prefer shadcn/ui `toast` for user notifications
- Use Drizzle ORM instead of raw SQL
- Keep comments minimal and meaningful

## Deployment
- Standard Next.js deployment (Vercel or custom). Ensure required env vars are set.
