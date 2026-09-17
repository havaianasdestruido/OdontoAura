# AGENTS.md — OdontoAura

Canonical guide for AI assistants and contributors. Read this file before editing code.
`CLAUDE.md` and `AI.md` are thin pointers to this file — keep this one authoritative.

Verified against the current source tree on 2026-09-17. Do not trust stale claims in
`docs/` or the README without cross-checking here first.

## 1. What this is

OdontoAura: dental clinic management system (appointments, patients, doctors,
medical records, health plans). Monorepo managed with **pnpm workspaces**.

```
apps/
  backend/     NestJS 12 + Fastify REST API (port 3001, global prefix /api)
  frontend/    Next.js 15 App Router (port 3000)
packages/
  shared/      @odontoaura/shared — Prisma schema + generated client
.github/       CI workflows, labeler, dependabot, templates
docs/          Stale/incomplete — do not trust (see §11)
```

## 2. Toolchain (non-negotiable)

- **pnpm 11.25.0** (root `package.json` has `packageManager: pnpm@11.25.0`).
  The lockfile is pnpm 11 format; a different pnpm version causes
  `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on `install --frozen-lockfile`.
- **Node >= 22.12** for backend (`apps/backend/package.json` engines). CI uses node 22.
- **pnpm overrides live in `pnpm-workspace.yaml`**, NOT in `package.json`
  (`pnpm.overrides` is ignored by pnpm 11). Current overrides: `postcss ^8.5.23`,
  `picomatch ^4.0.7`. Changing them requires `pnpm install --no-frozen-lockfile`
  to regenerate the lockfile.
- `.npmrc` sets `legacy-peer-deps=true`.
- TypeScript 6.x; strict mode (`tsconfig.base.json`).

## 3. Commands

Run everything through pnpm filters from the repo root.

```bash
pnpm install                    # root; postinstall auto-runs shared build (= prisma generate)
pnpm --filter @odontoaura/backend dev          # API on :3001 (./api/docs swagger)
pnpm --filter @odontoaura/frontend dev         # web on :3000
```

Checks (all pass in CI):
```bash
pnpm lint                                                        # both packages
pnpm --filter @odontoaura/backend exec tsc --noEmit
pnpm --filter @odontoaura/frontend exec tsc --noEmit
pnpm --filter @odontoaura/backend test           # vitest, src/**/*.spec.ts (mocked Prisma — no DB)
pnpm --filter @odontoaura/frontend test          # jest + RTL, src/__tests__
pnpm --filter @odontoaura/backend test:cloud     # live e2e vs deployed API (env-gated, see §11)
pnpm build                                       # parallel build both packages
```

Run `lint` + both `tsc --noEmit` after any change before committing.

## 4. Backend architecture (`apps/backend`)

- NestJS 12 on **Fastify** (`@nestjs/platform-fastify`), compiled by `nest build`.
- `src/app.bootstrap.ts`: `setGlobalPrefix('api')`, `ValidationPipe` with
  `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`,
  global `AllExceptionsFilter`, CORS from env `CORS_ORIGINS` (comma-separated),
  gzip `@fastify/compress` threshold 1024, Swagger at `/api/docs` only when
  `NODE_ENV !== 'production'`.
- `src/serverless.ts` + `scripts/bundle.mjs`: Vercel adapter — esbuild bundles
  `dist/serverless.js` to `dist/serverless.bundle.cjs`; `api/index.js` re-exports it.
  Any change to serverless/build path must keep `vercel-build` working
  (`prisma generate && nest build && node scripts/bundle.mjs`).
- `src/prisma/prisma.service.ts`: global Prisma `$use` middleware mapping
  **P2002 → Conflict**, **P2025 → NotFound**. Services sometimes add their own
  messages; don't strip them.
- Health: `GET /api/health`, `GET /api/health/ready` (public, no auth).

### Auth & security (do not weaken)

- JWT HS256 (secret required in production — boot fails without `JWT_SECRET`).
- `register` always creates `PATIENT`. Passwords: `PASSWORD_PEPPER` HMAC +
  bcrypt (10 rounds). Legacy non-peppered hashes still verify.
- On `register`/`login`, also sets cookie `token` (`Path=/api; HttpOnly;
  SameSite=Lax; Secure` in prod). JWT strategy accepts Bearer header OR cookie.
- Login rate limit in-memory per `email|ip`: `LOGIN_MAX_ATTEMPTS` (10),
  `LOGIN_WINDOW_MINUTES` (15). Buckets reset on instance restart.
- Controllers/gates: `JwtAuthGuard` + `RolesGuard` with `@Roles(...)`
  (`src/auth/roles.guard.ts`). `users.controller` blocks creating/promoting ADMIN
  and deleting self/admin. Frontend tokens also stored in `localStorage` (XSS caveat
  acknowledged in TODO comments — don't silently "fix" by removing cookie support).

### Route → access (authoritative)

| Route | Access |
| --- | --- |
| `/health`, `/health/ready` | public |
| `/auth/register`, `/auth/login`, `/auth/logout` | public (register → PATIENT) |
| `/auth/me` | any authenticated |
| `/users` GET | ADMIN, EMPLOYEE (EMPLOYEE gets no phone) |
| `/users` POST/PUT/DELETE | ADMIN (DELETE needs `?confirm=true`) |
| `/doctors` GET | any authenticated (PATIENT sees no userId/license) |
| `/doctors` POST/DELETE; `PUT`; availability CRUD | ADMIN create/delete; ADMIN+DOCTOR update (doctor only own profile/slots) |
| `/specialties` | GET any authenticated; write ADMIN |
| `/appointments` | GET role-scoped (PATIENT→self, DOCTOR→own profile); POST PATIENT/EMPLOYEE/ADMIN; `:id` PUT own/staff; `cancel` owner/staff/doctor (admin can override past with reason); `confirm` EMPLOYEE/ADMIN; `no-show` EMPLOYEE/ADMIN/DOCTOR; `start`/`complete` DOCTOR/ADMIN; DELETE ADMIN/EMPLOYEE |
| `/medical-records` | create: appointment doctor only (appointment IN_PROGRESS/COMPLETED, one per appointment); GET by `patientId`/`appointmentId`; update: doctor (locked once COMPLETED) or admin; DELETE: admin soft-void (`voidedAt`) |
| `/health-plans` | CRUD ADMIN; `assign` ADMIN/EMPLOYEE; `patient/:id`, `verify/:patientId/:planId` owner/staff; `patient-plan/:id` DELETE owner/staff. Delete blocked when assigned → deactivate instead |
| `/dashboard/stats` | any authenticated (DOCTOR sees only own scope) |

### Business rules (verify against `*.service.ts` when editing)

- Appointments: state machine `SCHEDULED→CONFIRMED→IN_PROGRESS→COMPLETED` (+
  CANCELLED/NO_SHOW per `VALID_TRANSITIONS`); no double-booking (doctor AND patient)
  across `BLOCKING_STATUSES`; future dates required; naive timestamps are treated as
  UTC (Z appended); duration 5–480 min (default 30).
- Doctor availability: `dayOfWeek` 0–6, times on a **5-minute grid**
  (enforced in DTO regex + `assertSlotInterval`), no overlaps. Booking requires a
  covering slot.

## 5. Frontend architecture (`apps/frontend`)

- Next.js 15 App Router; every interactive page is `'use client'` (no server
  components yet). UI copy is **Brazilian Portuguese** — keep it that way.
- `src/lib/api.ts`: axios instance, `baseURL = NEXT_PUBLIC_API_URL` (defaults to
  prod backend), 15s timeout, request interceptor injects `localStorage` token,
  401 → clear token + redirect `/auth/login`. `apiErrorMessage()` maps common
  failures to pt-BR messages.
- `src/stores/auth.store.ts`: zustand, `status` idle/loading/authenticated/
  unauthenticated; `setAuth`, `logout`, `isAuthenticated`, `hydrate` (calls
  `/auth/me`). Contains intentional TODO comments about persist/cross-tab/XSS.
- `src/lib/query-client.ts`: QueryClient staleTime 5 min, retry 1.
- Role-based sidebar in `src/app/dashboard/layout.tsx` (`roleNavItems`).
- VLibras accessibility widget in root `layout.tsx` — keep it working.
- Tailwind: custom `primary`/`secondary` palettes in `tailwind.config.ts`.
- Many `// TODO:` markers exist across the codebase — leave them; implement the
  ones you're asked to, don't mass-delete.

### Frontend tests

- Jest + Testing Library (jsdom), `src/__tests__/{page,appointments-page}.test.tsx`.
- Component tests **mock `@/lib/api` and `@/stores/auth.store`** (see existing files).
- Alias `@/* → src/*` mapped in jest config and tsconfig.

## 6. Database (`packages/shared/prisma/schema.prisma`)

- PostgreSQL; `DATABASE_URL` (pooled) + `DIRECT_URL`; Prisma client generated with
  binary targets `native` + `rhel-openssl-3.0.x` (Vercel runtime).
- Tables: `users`, `doctor_profiles`, `specialties`, `availability_slots`,
  `appointments`, `medical_records`, `health_plans`, `patient_health_plans`,
  `clinics`. UUID ids; `snake_case` via `@map`. Enums: `Role`, `AppointmentStatus`.
- Flow after editing schema: `pnpm --filter @odontoaura/shared run build` (generate),
  `pnpm --filter @odontoaura/shared exec prisma migrate dev --name <name>`,
  prod: `... exec prisma migrate deploy`.
- No seed script in the repo; local smoke users in README share password
  `secret123` (local only).

## 7. Git / CI / PRs

- Conventional Commits: `feat fix docs style refactor test chore ci`.
  `pr-check.yml` enforces allowed types on PRs. Work off `main`.
- CI (`ci.yml`): jobs lint / typecheck (both packages `tsc --noEmit`) /
  test backend / test frontend / test-backend-cloud / build. Uses
  `pnpm install --frozen-lockfile`, pnpm 11.25.0, node 22. Cloud test needs repo
  secrets `CLOUD_ADMIN_EMAIL`, `CLOUD_ADMIN_PASSWORD`, `CLOUD_TEST_REGISTER`.
- Auto-merge for dependabot (`deps.yml`), PR labeler (`labeler.yml`),
  dependabot weekly.

## 8. Deployment (Vercel) — verified quirks

- **Backend**: project alias `backend-eta-pink.vercel.app`. Deploy from
  `apps/backend` with `vercel --yes` / `vercel --prod`. `vercel.json` routes all
  to `/api/index` (serverless bundle).
- **Frontend**: project alias `frontend-five-blush-84.vercel.app`. Root Directory
  setting is `apps/frontend`; **deploy from the repo root with
  `vercel --archive=tgz`** — deploying from inside `apps/frontend` fails with
  "Root Directory apps/frontend does not exist".
- Swagger is off in prod (`NODE_ENV=production`). Both deployments require prod env
  vars (§10).

## 9. Environment variables (names verified in code)

Backend: `DATABASE_URL` (required), `DIRECT_URL`, `JWT_SECRET` (required in prod),
`JWT_EXPIRATION` (`/^\d+[sSmMhHdDwW]$/`), `JWT_ISSUER`, `JWT_AUDIENCE`, `NODE_ENV`,
`PORT`, `CORS_ORIGINS`, `PASSWORD_PEPPER`, `DATABASE_CONNECTION_LIMIT`,
`DATABASE_POOL_TIMEOUT`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`.

Frontend: `NEXT_PUBLIC_API_URL`.

⚠️ `.env.example` is stale: it names `CORS_ORIGIN` (code reads `CORS_ORIGINS`) and
references old `odonto-aura-*.vercel.app` URLs. `.env.local` is gitignored and
currently only holds a `VERCEL_OIDC_TOKEN` deployment artifact.

## 10. Windows / PowerShell local tips

- `pnpm` must be on PATH for scripts and postinstall:
  `$env:PATH="$env:APPDATA\npm;$env:PATH"`.
- Root `pnpm install` triggers postinstall that shells out to `pnpm`; in
  non-interactive shells set `$env:CI="true"` first (avoids
  `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`).
- `.\start_all.ps1` boots local PostgreSQL + backend (:3001) + frontend (:3000),
  writes PIDs under `.logs`; `.\start_all.ps1 -Stop` stops all; `-Mode prod` needs
  built `dist`. Local DB lives in gitignored `.pg/`.

## 11. Known gaps & stale docs (do not propagate)

- `docs/stack/*` describe Redis, Argon2, Express, Shadcn/UI, Prettier, Playwright —
  none are in the dependency tree. `docs/DEPLOY_GUIDE.md` uses old URLs and a
  pre-bundle adapter sketch. Treat `docs/` as historical.
- Root `test:e2e` script is a no-op (no package defines `test:e2e`); backend cloud
  tests live under `test:cloud`.
- Open Dependabot alert: `ajv@6.15.0` (medium) via eslint 8 — no patched 6.x line;
  overriding to 8.x breaks `next lint`. Leave as-is unless replacing eslint.

## 12. Security rules

- Never write `DATABASE_URL`, `JWT_SECRET`, `PASSWORD_PEPPER`, `.env.local`
  values, or Vercel tokens into files, logs, commits, or chat summaries.
- Never add ADMIN-promotion, delete-account, or role-escalation paths.
- Keep RBAC on controllers and ownership checks in services intact.