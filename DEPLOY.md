# Deploying to Vercel

## 1. Supabase (production project)

1. Create a Supabase project.
2. Apply the SQL in order (SQL Editor or CLI — see `supabase/README.md`):
   `0001_init.sql` → `0002_storage.sql` → `0003_budget_targets.sql` → `seed.sql`.
3. **Authentication → Providers → Email**: enable.
4. **Authentication → URL Configuration**:
   - Site URL: your Vercel production URL (e.g. `https://your-app.vercel.app`).
   - Redirect URLs: add `https://your-app.vercel.app/auth/callback`
     (and `http://localhost:3000/auth/callback` for local dev).

## 2. Vercel

1. Import the Git repo into Vercel (Framework preset: **Next.js**).
2. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `ANTHROPIC_API_KEY` (server-only)
3. Deploy.

Notes:
- `.npmrc` is git-ignored (it only overrides the local npm cache); Vercel uses
  its own cache, so nothing extra is needed there.
- The receipt-processing route (`/api/receipts/process`) runs on the Node
  runtime with `maxDuration = 60`. On Vercel Hobby the cap is lower; if vision
  calls time out, upgrade the plan or move processing to a background job.
- After deploy, verify the magic-link redirect resolves to
  `/auth/callback` on the production domain.

## 3. Smoke test

1. Open the production URL → sign in with a magic link.
2. `/settings/budget` → set income + budgets.
3. `/scan` → photograph a Japanese receipt → review → save.
4. `/dashboard` and `/insights` should reflect the spend.

## PWA

A web manifest (`/manifest.webmanifest`) + `public/icon.svg` make the app
installable and mobile-first. For best install UX, add 192×192 and 512×512 PNG
icons under `public/` and reference them in `app/manifest.ts`.
