# OdontoAura — Deploy Guide (Vercel + Supabase)

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│  Frontend   │──────▶│   Backend    │──────▶│  Supabase    │
│  (Vercel)   │ HTTPS │  (Vercel)    │  SQL  │  (Postgres)  │
│  Next.js 15 │       │  NestJS 12   │       │  Prisma ORM  │
└─────────────┘       └──────────────┘       └──────────────┘
```

- **Frontend**: Next.js deployed to Vercel (static + SSR)
- **Backend**: NestJS deployed to Vercel as serverless functions
- **Database**: Supabase Postgres (managed)

---

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- GitHub account with repo pushed
- Vercel account (https://vercel.com)
- Supabase account (https://supabase.com)

---

## Part 1 — Supabase (Database)

### 1.1 Create a Supabase project

1. Go to https://supabase.com/dashboard → **New Project**
2. Choose org, name it `odontoaura`, set a **DB password** (save it), region closest to you
3. Wait for project to finish provisioning (~1 min)

### 1.2 Get the connection string

1. In the Supabase dashboard → **Settings → Database**
2. Copy the **Connection string (URI)** under "Connection string" → **URI** tab
3. It looks like:
   ```
   postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Replace `[PASSWORD]` with your DB password
5. Append `?schema=public` at the end:
   ```
   postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?schema=public
   ```
6. **Save this as your `DATABASE_URL`**

> Use the **port 6543** (transaction pooler) for serverless. If you see port 5432 (direct), switch to the pooler URI.

### 1.3 Run Prisma migrations

From your local machine, with the Supabase `DATABASE_URL`:

```powershell
# Set the env var temporarily
$env:DATABASE_URL = "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?schema=public"

# Navigate to the backend
cd apps/backend

# Generate client + push schema to Supabase
npx prisma migrate deploy
# If no migration files exist yet:
npx prisma db push
```

Verify tables were created: Supabase Dashboard → **Table Editor** — you should see `users`, `appointments`, `doctor_profiles`, etc.

### 1.4 (Optional) Create a seed admin user

```powershell
npx prisma studio
```

Or use the Supabase SQL Editor to insert a user manually.

---

## Part 2 — Backend on Vercel

### 2.1 Create the Vercel serverless adapter

Create the file `apps/backend/api/index.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';

let app: NestFastifyApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const instance = app.getHttpAdapter().getInstance();
  instance.routing(req, res);
}
```

### 2.2 Create `apps/backend/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

### 2.3 Deploy backend to Vercel

```powershell
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from backend dir
cd apps/backend
vercel --yes
```

### 2.4 Set backend environment variables

In the Vercel dashboard for the backend project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string from step 1.2 |
| `JWT_SECRET` | A strong random string (e.g. `openssl rand -base64 32`) |
| `JWT_EXPIRATION` | `1h` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `CORS_ORIGINS` | Your frontend Vercel URL (e.g. `https://odontoaura.vercel.app`) |

Then redeploy:

```powershell
vercel --prod
```

### 2.5 Note your backend URL

After deploy, Vercel gives you a URL like:
```
https://odontoaura-backend.vercel.app
```

Your API base will be: `https://odontoaura-backend.vercel.app/api`

---

## Part 3 — Frontend on Vercel

### 3.1 Configure the Vercel project

```powershell
cd apps/frontend
vercel --yes
```

When prompted:
- **Framework**: Next.js (auto-detected)
- **Root directory**: `apps/frontend` (if deploying from monorepo root, set this in dashboard)

### 3.2 Set frontend environment variables

In the Vercel dashboard for the frontend project → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://odontoaura-backend.vercel.app/api` |

### 3.3 Configure monorepo root directory

If deploying from the GitHub repo root:

1. Vercel Dashboard → frontend project → **Settings → General**
2. Set **Root Directory** to `apps/frontend`
3. Under **Build & Development Settings**:
   - Build Command: `cd ../.. && pnpm install && pnpm --filter @odontoaura/shared run build && cd apps/frontend && pnpm run build`
   - Install Command: (leave blank or `pnpm install`)

### 3.4 Deploy

```powershell
vercel --prod
```

---

## Part 4 — Connect GitHub for auto-deploy (Optional)

1. Go to https://vercel.com/dashboard
2. For each project (frontend and backend):
   - **Settings → Git** → Connect your GitHub repo
   - Set the **Root Directory** (`apps/frontend` or `apps/backend`)
3. Every push to `main` will trigger a deploy automatically

---

## Part 5 — Verify everything works

### 5.1 Backend health check

```
GET https://odontoaura-backend.vercel.app/api/health
GET https://odontoaura-backend.vercel.app/api/health/ready
```

Both should return `200 OK`.

### 5.2 Swagger docs

```
https://odontoaura-backend.vercel.app/api/docs
```

> Note: Swagger is disabled when `NODE_ENV=production`. Set `NODE_ENV=staging` temporarily to verify, then switch back.

### 5.3 Frontend

Open `https://odontoaura.vercel.app` — should show the login page.

---

## Environment Variables Summary

### Backend (Vercel)

| Variable | Required | Example |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres.[ref]:...` |
| `JWT_SECRET` | Yes (prod) | `K7x9...random...base64` |
| `JWT_EXPIRATION` | No | `1h` |
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | `3001` |
| `CORS_ORIGINS` | Yes | `https://odontoaura.vercel.app` |
| `PASSWORD_PEPPER` | No | Random string for extra hash security |
| `LOGIN_MAX_ATTEMPTS` | No | `10` |
| `LOGIN_WINDOW_MINUTES` | No | `15` |

### Frontend (Vercel)

| Variable | Required | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://odontoaura-backend.vercel.app/api` |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `P1001: Can't reach database` | Check `DATABASE_URL` uses pooler port `6543`, not `5432` |
| `JWT_SECRET must be set` | Add `JWT_SECRET` to Vercel env vars |
| CORS errors in browser | Add frontend URL to `CORS_ORIGINS` in backend env vars |
| Prisma client not generated | Add `"postinstall": "prisma generate"` to backend `package.json` |
| `@odontoaura/shared` not found | Ensure build command runs shared package build first |
| Cold start slow (>10s) | Normal for serverless NestJS; consider Railway/Render for persistent backend |

---

## Alternative: Backend on Railway or Render

NestJS + Fastify on Vercel serverless may hit cold-start limits (10s on free tier). For a persistent server:

1. **Railway** (https://railway.app): connect GitHub, set root to `apps/backend`, add env vars, done
2. **Render** (https://render.com): same flow, free tier available

Build command: `cd apps/backend && pnpm run build`
Start command: `node apps/backend/dist/main`

Update `NEXT_PUBLIC_API_URL` on the frontend to point to Railway/Render URL instead.
