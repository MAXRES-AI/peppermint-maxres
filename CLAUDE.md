# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Peppermint is a self-hosted ticket management system (open-source Zendesk alternative). It handles ticket lifecycle, client management, email-to-ticket ingestion, time tracking, SSO/OIDC auth, and webhooks.

## Monorepo Structure

Yarn 4.2.2 workspaces with Turbo 2.0.3 orchestration:

- `apps/api` — Fastify 5 backend, TypeScript, Prisma + PostgreSQL, port 5003
- `apps/client` — Next.js 13.5 frontend (pages router), Tailwind + Radix UI, port 3000
- `apps/docs` — Nextra documentation site
- `apps/landing` — Next.js 15 marketing site
- `packages/config` — Shared ESLint presets
- `packages/tsconfig` — Shared TypeScript configs

## Common Commands

```bash
# Root (Turbo — runs all apps)
yarn dev          # Start all apps in parallel
yarn build        # Build all apps
yarn lint         # Lint all apps
yarn format       # Prettier format (ts, tsx, md)

# API (apps/api)
npm run dev       # ts-node-dev with respawn
npm run build     # Compile TypeScript → dist/
npm run generate  # Regenerate Prisma client after schema changes
npm run db:migrate  # Create migration (dev only)
npm run db:push     # Apply schema directly (accepts data loss)

# Client (apps/client)
npm run dev       # Next.js dev server
npm run build     # Standalone Next.js build
```

No test framework is currently configured.

## Architecture

### API (`apps/api/src/`)

- `app.ts` — Fastify app bootstrap; registers plugins (CORS, session, multipart, rate-limit, Swagger)
- `controllers/` — Route handlers grouped by domain: `auth`, `ticket`, `client`, `config`, `notebook`, `queue` (email ingestion), `roles`, `storage`, `time`, `users`, `webhooks`
- `middleware/` — `requirePermission()` RBAC guard used on protected routes
- `prisma/schema.prisma` — Single source of truth for all models
- `prisma/seed.js` — Seeds default admin (`admin@admin.com` / `1234`) and config on startup
- `lib/` — Shared utilities: email (nodemailer/IMAP), OAuth/OIDC/SAML helpers, PostHog analytics

On startup, the API automatically runs `prisma migrate deploy` then `db seed`.

IMAP polling runs every 10 seconds in background to convert emails → tickets.

### Client (`apps/client/`)

- Pages-based Next.js routing under `src/pages/`
- `/api/v1/*` requests are proxied to the API at port 5003 (via `next.config.js` rewrites)
- Auth state managed via `session.js` context
- i18n via `next-translate`; locale files in `locales/`
- Rich text editing via BlockNote v0.17

### Database

PostgreSQL required. Key models: `User`, `Ticket`, `Client`, `Team`, `Comment`, `TimeTracking`, `Note`, `Todo`, `EmailQueue`, `Webhook`.

Ticket statuses: `needs_support | in_progress | in_review | on_hold | done`
Ticket types: `bug | feature | support | incident | service | maintenance | access | feedback`

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql://user:password@host:port/dbname` |
| `SECRET` | JWT/session secret |
| `NODE_ENV` | `development` or `production` |

### Production Deployment

Multi-stage `dockerfile` builds both apps; PM2 (`ecosystem.config.js`) runs client + API as two processes. `docker-compose.yml` includes PostgreSQL.

## Key Patterns

- API routes are Swagger-documented; run the API and visit `/api/v1/docs`
- Add new API routes in the relevant controller, register in `app.ts`
- After any Prisma schema change: `npm run generate` (and `npm run db:migrate` in dev)
- Role-based access: wrap routes with `requirePermission()` middleware
- File uploads handled via Formidable/multer; stored in `storage/`
