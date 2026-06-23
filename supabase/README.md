# Supabase setup

SQL for the database lives here:

- `migrations/0001_init.sql` — tables, indexes, RLS policies, signup trigger.
- `migrations/0002_storage.sql` — private `receipts` bucket + per-user RLS.
- `seed.sql` — default categories and Japanese store mappings (re-runnable).

## Apply (no Docker required)

### Option A — Dashboard SQL editor (simplest)

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run the files in order:
   `0001_init.sql` → `0002_storage.sql` → `seed.sql`.
3. **Authentication → Providers → Email**: enable, and turn on
   "Confirm email" so magic links are sent.
4. **Authentication → URL Configuration**: add your local + prod URLs and the
   redirect `http://localhost:3000/auth/callback` (and the prod equivalent).
5. Copy **Project Settings → API** values into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).

### Option B — Supabase CLI (link a remote project)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies migrations/
npx supabase db execute --file supabase/seed.sql
```

(`supabase start` for a full local stack needs Docker, which isn't required here.)

## Generate TypeScript types (after the schema is applied)

```bash
npx supabase gen types typescript --project-id <ref> > types/database.ts
```

Then the app can type Supabase queries against `Database`.

## Conventions

- **JPY = integer yen** everywhere (no decimals).
- `categories`, `store_categories`, `item_category_map` rows with
  `user_id = NULL` are global defaults (readable by all, writable only via
  seed / service role); non-null rows are user-owned.
- Receipt images: `receipts/{user_id}/{receipt_id}.jpg` in Storage.
