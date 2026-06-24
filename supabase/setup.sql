-- 新しい Supabase プロジェクトで1回だけ実行してください（SQL Editor に貼り付けて Run）。

-- Receipt-based budgeting app — core schema, indexes, RLS.
-- JPY is stored as integer yen everywhere (no decimals).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Generic updated_at touch trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency     text not null default 'JPY',
  locale       text not null default 'ja-JP',
  created_at   timestamptz not null default now()
);

-- Create a profile row automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories (user_id NULL = global default; non-null = user-defined)
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  slug       text not null,
  name       text not null,
  icon       text,
  color      text,
  is_sweet   boolean not null default false,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

-- Unique slug among global defaults, and unique slug per user.
create unique index categories_global_slug_key
  on public.categories (slug) where user_id is null;
create unique index categories_user_slug_key
  on public.categories (user_id, slug) where user_id is not null;

-- ---------------------------------------------------------------------------
-- store_categories (store-name → kind; user_id NULL = global default)
-- ---------------------------------------------------------------------------
create table public.store_categories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete cascade,
  match_pattern   text not null,      -- normalized substring to match in store name
  store_kind      text not null,      -- 'convenience','supermarket','drugstore',...
  is_convenience  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index store_categories_pattern_idx
  on public.store_categories (match_pattern);

-- ---------------------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------------------
create table public.receipts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  image_path            text,
  store_name            text,
  store_name_normalized text,
  store_kind            text,
  is_convenience        boolean not null default false,
  purchased_at          date,
  total_amount          integer,          -- JPY (integer yen)
  currency              text not null default 'JPY',
  status                text not null default 'processing'
    check (status in ('processing','pending_review','confirmed','failed')),
  ocr_confidence        numeric,
  ocr_raw               jsonb,
  created_at            timestamptz not null default now()
);

create index receipts_user_purchased_idx
  on public.receipts (user_id, purchased_at desc);
create index receipts_user_status_idx
  on public.receipts (user_id, status);

-- ---------------------------------------------------------------------------
-- receipt_items
-- ---------------------------------------------------------------------------
create table public.receipt_items (
  id              uuid primary key default gen_random_uuid(),
  receipt_id      uuid not null references public.receipts (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  name_normalized text,
  quantity        numeric not null default 1,
  unit_price      integer,
  amount          integer not null,       -- line total, JPY
  category_id     uuid references public.categories (id) on delete set null,
  is_sweet        boolean not null default false,
  source          text not null default 'ocr' check (source in ('ocr','user')),
  created_at      timestamptz not null default now()
);

create index receipt_items_receipt_idx on public.receipt_items (receipt_id);
create index receipt_items_user_category_idx
  on public.receipt_items (user_id, category_id);

-- ---------------------------------------------------------------------------
-- item_category_map (learned name → category cache; user_id NULL = shared)
-- ---------------------------------------------------------------------------
create table public.item_category_map (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete cascade,
  name_normalized text not null,
  category_id     uuid not null references public.categories (id) on delete cascade,
  hits            int not null default 1,
  updated_at      timestamptz not null default now()
);

create unique index item_category_map_global_key
  on public.item_category_map (name_normalized) where user_id is null;
create unique index item_category_map_user_key
  on public.item_category_map (user_id, name_normalized) where user_id is not null;

create trigger item_category_map_updated_at
  before update on public.item_category_map
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- budgets (per month: income + total budget)
-- ---------------------------------------------------------------------------
create table public.budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  period_month   date not null,            -- first day of the month
  monthly_income integer,                  -- JPY
  total_budget   integer,                  -- JPY
  created_at     timestamptz not null default now(),
  unique (user_id, period_month)
);

-- ---------------------------------------------------------------------------
-- budget_goals (per month, optionally per category; NULL category = overall)
-- ---------------------------------------------------------------------------
create table public.budget_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete cascade,
  period_month date not null,
  limit_amount integer not null,           -- JPY
  created_at   timestamptz not null default now()
);

-- One goal per (user, category, month). Treat NULL category as "overall".
create unique index budget_goals_user_cat_month_key
  on public.budget_goals (user_id, category_id, period_month)
  where category_id is not null;
create unique index budget_goals_user_overall_month_key
  on public.budget_goals (user_id, period_month)
  where category_id is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.store_categories  enable row level security;
alter table public.receipts          enable row level security;
alter table public.receipt_items     enable row level security;
alter table public.item_category_map enable row level security;
alter table public.budgets           enable row level security;
alter table public.budget_goals      enable row level security;

-- profiles: a user manages only their own row.
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Owned tables: full CRUD over rows where user_id = auth.uid().
create policy "receipts: all own" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receipt_items: all own" on public.receipt_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets: all own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budget_goals: all own" on public.budget_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tables with global defaults (user_id NULL): everyone reads defaults + own;
-- writes only own rows (defaults are managed by seeds / service role).
create policy "categories: read defaults and own" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories: insert own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories: update own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories: delete own" on public.categories
  for delete using (auth.uid() = user_id);

create policy "store_categories: read defaults and own" on public.store_categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "store_categories: insert own" on public.store_categories
  for insert with check (auth.uid() = user_id);
create policy "store_categories: update own" on public.store_categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "store_categories: delete own" on public.store_categories
  for delete using (auth.uid() = user_id);

create policy "item_category_map: read defaults and own" on public.item_category_map
  for select using (user_id is null or auth.uid() = user_id);
create policy "item_category_map: insert own" on public.item_category_map
  for insert with check (auth.uid() = user_id);
create policy "item_category_map: update own" on public.item_category_map
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "item_category_map: delete own" on public.item_category_map
  for delete using (auth.uid() = user_id);


-- Private bucket for receipt images. Files live under a per-user folder:
--   receipts/{user_id}/{receipt_id}.jpg
-- RLS on storage.objects restricts access to the owner's folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "receipts: read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "receipts: insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "receipts: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "receipts: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- Headline trackers for the MVP: sweets (item-category) and convenience
-- (store-kind) budgets live directly on the monthly budget row.
alter table public.budgets
  add column if not exists sweets_budget      integer,
  add column if not exists convenience_budget integer;


-- Global default categories and store mappings (user_id = NULL).
-- Re-runnable: categories upsert by slug; store defaults are replaced.

-- ---------------------------------------------------------------------------
-- Default categories
-- ---------------------------------------------------------------------------
insert into public.categories (user_id, slug, name, is_sweet, sort, icon, color)
values
  (null, 'sweets',        'お菓子',     true,  10, '🍬', '#f59e0b'),
  (null, 'beverages',     '飲料',       false, 20, '🥤', '#0ea5e9'),
  (null, 'groceries',     '食料品',     false, 30, '🛒', '#22c55e'),
  (null, 'prepared_food', '惣菜・弁当', false, 40, '🍱', '#ef4444'),
  (null, 'dining',        '外食',       false, 50, '🍴', '#a855f7'),
  (null, 'household',     '日用品',     false, 60, '🧴', '#64748b'),
  (null, 'other',         'その他',     false, 99, '📦', '#94a3b8')
on conflict (slug) where user_id is null do nothing;

-- ---------------------------------------------------------------------------
-- Default store mappings (normalized lowercase patterns; match by substring)
-- ---------------------------------------------------------------------------
delete from public.store_categories where user_id is null;

insert into public.store_categories (user_id, match_pattern, store_kind, is_convenience)
values
  -- Convenience stores (コンビニ)
  (null, 'セブン',           'convenience', true),
  (null, 'seven',            'convenience', true),
  (null, '7-eleven',         'convenience', true),
  (null, 'ファミリーマート', 'convenience', true),
  (null, 'ファミマ',         'convenience', true),
  (null, 'familymart',       'convenience', true),
  (null, 'ローソン',         'convenience', true),
  (null, 'lawson',           'convenience', true),
  (null, 'ミニストップ',     'convenience', true),
  (null, 'ministop',         'convenience', true),
  (null, 'デイリーヤマザキ', 'convenience', true),
  (null, 'セイコーマート',   'convenience', true),
  (null, 'seicomart',        'convenience', true),
  (null, 'ニューデイズ',     'convenience', true),
  (null, 'newdays',          'convenience', true),

  -- Supermarkets (スーパー)
  (null, 'イオン',           'supermarket', false),
  (null, 'aeon',             'supermarket', false),
  (null, 'イトーヨーカドー', 'supermarket', false),
  (null, '西友',             'supermarket', false),
  (null, 'seiyu',            'supermarket', false),
  (null, 'ライフ',           'supermarket', false),
  (null, 'マルエツ',         'supermarket', false),
  (null, '業務スーパー',     'supermarket', false),
  (null, 'まいばすけっと',   'supermarket', false),

  -- Drugstores (ドラッグストア)
  (null, 'マツモトキヨシ',   'drugstore',   false),
  (null, 'マツキヨ',         'drugstore',   false),
  (null, 'ウエルシア',       'drugstore',   false),
  (null, 'ツルハ',           'drugstore',   false),
  (null, 'サンドラッグ',     'drugstore',   false),
  (null, 'ココカラ',         'drugstore',   false);
