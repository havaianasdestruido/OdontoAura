# AI.md

Canonical repo guide lives in **AGENTS.md** (root). Read it before editing any code.

Quick start:
- Install / build shared: `pnpm install`
- Backend: `pnpm --filter @odontoaura/backend dev` (:3001), `test`, `exec tsc --noEmit`
- Frontend: `pnpm --filter @odontoaura/frontend dev` (:3000), `test`, `exec tsc --noEmit`
- Migrations (from `packages/shared`): `prisma migrate dev|deploy`
- Rules: keep auth/RBAC intact, never commit secrets, pt-BR UI, `pnpm lint` + typechecks before commit.