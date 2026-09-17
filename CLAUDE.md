# CLAUDE.md

Canonical repo guide lives in **AGENTS.md**. Read it before editing any code.

Highlights:
- pnpm 11.25.0 / Node 22 monorepo (workspaces: `apps/backend`, `apps/frontend`, `packages/shared`).
- Backend: NestJS 12 + Fastify on :3001 (`/api` prefix). Frontend: Next.js 16 static export on :3000 (GitHub Pages).
- Checks before commit: `pnpm lint`, both `tsc --noEmit`, both test suites (`see AGENTS.md §3`).
- Do not weaken auth/RBAC; do not commit secrets; UI copy stays pt-BR.