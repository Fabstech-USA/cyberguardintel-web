# CyberGuardIntel-Web

HIPAA & SOC 2 compliance automation platform built by **Fabstech LLC**.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **Auth:** Clerk (MFA enforced)
- **Database:** PostgreSQL via Prisma 7
- **UI:** shadcn/ui, Tailwind CSS 4, Radix UI, Recharts
- **Storage:** AWS S3 (SSE-KMS encrypted evidence files)
- **Payments:** Stripe
- **Editor:** Tiptap (policy authoring)
- **Testing:** Vitest

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Clerk, Stripe, and AWS credentials

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local   # then fill in values

# Push the Prisma schema to your database
npx prisma db push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start development server          |
| `npm run build`    | Generate Prisma client & build    |
| `npm run start`    | Start production server           |
| `npm run lint`     | Run ESLint                        |
| `npm run type-check` | Run TypeScript type checking    |
| `npm run test`     | Run Vitest test suite             |
| `npm run worker`   | Start BullMQ evidence collection worker |

## Evidence collection worker (manual acceptance)

1. Configure `UPSTASH_REDIS_URL`, `DATABASE_URL`, `ENCRYPTION_KEY`, AWS S3 vars, `AI_SERVICE_URL`, and `INTERNAL_API_KEY` in `.env.local`.
2. Start the AI service (`cyberguardintel-ai`) and seed HIPAA controls for your org (`npx tsx prisma/seed.ts`; complete onboarding so `OrgControl` rows exist).
3. Connect **AWS** or **Google Workspace** from `/integrations` when demo mode is enabled (default in development), or connect a real integration.
4. Run `npm run worker` in this repo (long-lived process; deploy separately from Vercel — see Railway section below).
5. `POST /api/integrations/sync/:id` while signed in (optional body: `{ "jobType": "INCREMENTAL" }`), or use **Sync** on `/integrations`.
6. Verify `CollectionJob` is `COMPLETED`, `Evidence` rows exist with `fileHash`/`metadata`, S3 keys under `orgs/.../controls/...`, `Integration.lastSync*` updated, and `AuditLog` rows with `evidence.created`.

## Deploy worker on Railway

The Next.js app stays on **Vercel**. The BullMQ worker is a separate always-on process. Deploy it next to the existing FastAPI AI service on Railway.

Files:

- [`Dockerfile.worker`](Dockerfile.worker) — production image that runs `npm run worker`
- [`railway.toml`](railway.toml) — Railway build/deploy config pointing at that Dockerfile

### Create the service

1. In Railway, open the same project as the AI service.
2. **New Service** → **GitHub Repo** → select `cyberguardintel-web` (this repo).
3. Railway should pick up `railway.toml` / `Dockerfile.worker`. If not, set **Dockerfile path** to `Dockerfile.worker`.
4. Do **not** enable a public HTTP domain for this service (it does not serve web traffic).
5. Keep **1 replica** running.

### Required environment variables

Set these on the worker service (same values as Vercel / local `.env.local` where applicable):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Same Neon/Postgres URL as the web app |
| `ENCRYPTION_KEY` | Same key used to encrypt integration credentials |
| `UPSTASH_REDIS_URL` | BullMQ TCP URL (`rediss://default:…@….upstash.io:6379`) |
| `AI_SERVICE_URL` | Public URL of your Railway AI service (e.g. `https://….up.railway.app`) |
| `INTERNAL_API_KEY` | Must match the AI service secret |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Evidence uploads |
| `AWS_REGION` / `AWS_S3_BUCKET` | Same bucket as web |
| `KMS_KEY_ID` or `AWS_KMS_KEY_ID` | If you use SSE-KMS (optional if alias resolution works) |

Optional Redis helpers if you only have the REST endpoint: `UPSTASH_REDIS_REST_TOKEN` / `UPSTASH_REDIS_TOKEN`.

### Verify

1. Deploy and open Railway logs — you should see: `Evidence collection worker listening on queue "…"`.
2. In the app, open a connected integration and click **Sync now**.
3. Worker logs should show `Job … completed`; the UI toast should report success.

Local equivalent: `npm run worker` with the same env vars loaded from `.env.local`.

## Scheduled integration sync (cron)

Vercel invokes `POST /api/integrations/sync/cron` daily at **02:00 UTC** (`0 2 * * *` in `vercel.json`). The route enqueues an `INCREMENTAL` `CollectionJob` for every `ACTIVE` integration across all organizations. Set `CRON_SECRET` in Vercel (sent as `Authorization: Bearer …`); jobs are processed by the Railway worker (`npm run worker`).

## Project Structure

```
src/
  app/
    (auth)/          # Sign-in & sign-up pages (public)
    (dashboard)/     # Authenticated app routes
      audit/         # Audit log & export
      dashboard/     # Main dashboard
      evidence/      # Evidence management & uploads
      hipaa/         # Policies, BAA tracker, PHI map, risk assessment, training
      integrations/  # Third-party integrations
      onboarding/    # New-org onboarding flow
      settings/      # Organization settings
      soc2/          # SOC 2 framework & controls
    api/             # API routes
  components/        # Reusable UI components
  lib/               # Utilities (prisma, s3, crypto, tenant, etc.)
  generated/         # Prisma generated client
```

## Environment Variables

| Variable          | Purpose                            |
| ----------------- | ---------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string       |
| `ENCRYPTION_KEY`  | Hex-encoded AES key for credential encryption |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key                 |

Refer to `.env.example` for the full list.

## License

Proprietary &mdash; Fabstech LLC. All rights reserved.
