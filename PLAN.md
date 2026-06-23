# Receipt-Based Budgeting App — Implementation Plan

> Status: **planning only — no code yet.**
> Locale assumption: **Japanese receipts, JPY currency** (date format `2026年6月23日`, stores like コンビニ/スーパー, items like お菓子). This drives OCR, currency, and category design throughout.

---

## 0. Product summary

Scan a paper receipt with a phone camera → automatically extract **items, prices, date, store name** → **auto-categorize** each purchase → track **sweets spending (お菓子)** and **convenience-store spending (コンビニ)** specifically → compare actual spend against **monthly income & budget goals** → show **friendly, non-judgmental feedback** to nudge down unnecessary spending.

Two distinct tracking axes (important — they're different):
- **Sweets spending** = an *item-category* total (sum of items categorized `sweets`).
- **Convenience-store spending** = a *store-category* total (sum of receipts where the store is a conbini).

So we classify at **both** the receipt/store level and the item level.

---

## 1. Architecture

**Full-stack Next.js (App Router) on Vercel, backed by Supabase.**

```
┌──────────────── Phone browser (PWA) ────────────────┐
│  Next.js client components                            │
│  • Camera capture (<input capture> / getUserMedia)    │
│  • Client-side image downscale/compress               │
│  • Review & edit extracted receipt                    │
│  • Dashboard / charts                                 │
└───────────────┬───────────────────────┬──────────────┘
                │ (1) signed upload      │ (5) read data (RSC + RLS)
                ▼                        ▼
        Supabase Storage          Supabase Postgres
        (receipt images)          (receipts, items, budgets…)
                ▲                        ▲
                │ (2) trigger            │ (4) write structured rows
                ▼                        │
┌────────── Next.js server (Vercel, Node runtime) ──────┐
│  Route handler / Server Action: /api/receipts/process │
│  • Downloads image                                     │
│  • (3) Calls Claude Opus 4.8 vision → structured JSON  │
│  • Runs categorization (cache → LLM result)            │
│  • Writes receipt + items, status = pending_review     │
│  ANTHROPIC_API_KEY stays server-side only              │
└───────────────────────────────────────────────────────┘
```

**Key decisions**
- **App Router + React Server Components** for data-heavy reads (dashboard, history) using Supabase server client with the user's session → RLS enforces per-user isolation automatically.
- **Client Components** only where interactivity is needed (camera, edit forms, charts).
- **Processing is synchronous in a Node-runtime route handler** for the MVP: client uploads, then calls the process endpoint, shows a loading state, polls/awaits the result (Claude vision call is typically a few seconds). If latency/timeouts become a problem, move to a queue/background job (Supabase Edge Function + a `status` state machine) — designed for but not built in MVP.
- **Secrets**: `ANTHROPIC_API_KEY` and the Supabase **service-role key** live only in server env (Vercel project env vars). The browser only ever gets the Supabase anon key + the user's JWT.
- **Auth**: Supabase Auth (email magic link / OAuth). Session via `@supabase/ssr` cookies, read in middleware + server components.

**Runtime/cost notes for the AI calls** (from the current Claude API reference):
- Model: `claude-opus-4-8` (Opus 4.8, vision-capable, 1M context, $5/$25 per MTok).
- Use **structured outputs** (`output_config.format` with a JSON schema) so the model returns validated receipt JSON — no brittle parsing.
- Use **adaptive thinking** off or `effort: "low"`/`"medium"` for this extraction task — it's mechanical, doesn't need deep reasoning; keep latency/cost down. (Tune later.)
- Images: send base64; **downscale client-side** before upload (receipts are tall; cap long edge ~2000px) to control image-token cost.
- Japanese text in images is handled natively by Claude vision.

---

## 2. Folder structure

```
sweet-tracker/
├─ app/
│  ├─ (marketing)/                 # public landing (optional)
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  └─ callback/route.ts         # Supabase auth callback
│  ├─ (app)/                       # authed area (layout guards session)
│  │  ├─ layout.tsx
│  │  ├─ dashboard/page.tsx        # monthly summary + feedback
│  │  ├─ scan/page.tsx             # camera capture + upload
│  │  ├─ receipts/
│  │  │  ├─ page.tsx               # history list
│  │  │  ├─ [id]/page.tsx          # receipt detail
│  │  │  └─ [id]/review/page.tsx   # edit/confirm extracted data
│  │  ├─ insights/page.tsx         # charts & trends
│  │  └─ settings/
│  │     ├─ budget/page.tsx        # income + budget goals
│  │     └─ categories/page.tsx    # manage categories
│  ├─ api/
│  │  └─ receipts/
│  │     └─ process/route.ts       # POST: run OCR+categorize (Node runtime)
│  ├─ layout.tsx
│  └─ globals.css
├─ components/
│  ├─ ui/                          # shadcn/ui generated components
│  ├─ scan/                        # CameraCapture, UploadProgress
│  ├─ receipt/                     # ReceiptEditor, ItemRow, CategoryPicker
│  ├─ dashboard/                   # BudgetGauge, SpendCard, FeedbackBanner
│  └─ charts/                      # spending charts (recharts)
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts                 # browser client
│  │  ├─ server.ts                 # RSC/server-action client (cookies)
│  │  └─ admin.ts                  # service-role client (server only)
│  ├─ ai/
│  │  ├─ anthropic.ts              # Anthropic SDK client (server only)
│  │  ├─ extract-receipt.ts        # vision call + schema
│  │  └─ receipt-schema.ts         # JSON schema + TS types (zod)
│  ├─ categorize/
│  │  ├─ rules.ts                  # keyword/store rules
│  │  └─ resolve.ts               # cache → LLM-result → fallback
│  ├─ budget/
│  │  ├─ aggregate.ts              # monthly rollups
│  │  └─ feedback.ts               # friendly-message generation
│  └─ format.ts                    # JPY/date formatting (ja-JP)
├─ types/                          # shared DB/domain types
├─ supabase/
│  ├─ migrations/                  # SQL migrations (schema + RLS)
│  └─ seed.sql                     # default categories
├─ middleware.ts                   # auth/session refresh + route guard
├─ .env.local.example
├─ PLAN.md
└─ package.json
```

---

## 3. Database schema (Postgres / Supabase)

All user-owned tables carry `user_id uuid references auth.users` and have **RLS** `using (auth.uid() = user_id)`.

```sql
-- Profile (1:1 with auth.users)
profiles(
  id uuid pk references auth.users,
  display_name text,
  currency text default 'JPY',
  locale text default 'ja-JP',
  created_at timestamptz default now()
)

-- Categories (system defaults have user_id NULL; users can add their own)
categories(
  id uuid pk default gen_random_uuid(),
  user_id uuid null references auth.users,   -- null = global default
  slug text not null,                        -- 'sweets','convenience','groceries',...
  name text not null,                        -- localized label (お菓子, コンビニ ...)
  icon text, color text,
  is_sweet boolean default false,            -- fast flag for sweets tracking
  sort int default 0,
  created_at timestamptz default now()
)

-- Store-category lookup (is a given store a conbini? grocery? etc.)
store_categories(
  id uuid pk default gen_random_uuid(),
  user_id uuid null references auth.users,
  match_pattern text not null,               -- normalized store-name pattern
  store_kind text not null,                  -- 'convenience','supermarket','drugstore',...
  is_convenience boolean default false,      -- fast flag for conbini tracking
  created_at timestamptz default now()
)

-- Receipts
receipts(
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users,
  image_path text,                           -- Supabase Storage path
  store_name text,
  store_name_normalized text,
  store_kind text,                           -- resolved (convenience/supermarket/...)
  is_convenience boolean default false,
  purchased_at date,                         -- receipt date
  total_amount integer,                      -- JPY = integer yen (no decimals)
  currency text default 'JPY',
  status text default 'processing',          -- processing|pending_review|confirmed|failed
  ocr_confidence numeric,
  ocr_raw jsonb,                             -- full model output for debugging
  created_at timestamptz default now()
)

-- Receipt line items
receipt_items(
  id uuid pk default gen_random_uuid(),
  receipt_id uuid not null references receipts on delete cascade,
  user_id uuid not null references auth.users,   -- denormalized for RLS
  name text not null,
  name_normalized text,
  quantity numeric default 1,
  unit_price integer,
  amount integer not null,                       -- line total, yen
  category_id uuid references categories,
  is_sweet boolean default false,
  source text default 'ocr',                     -- ocr|user (edited)
  created_at timestamptz default now()
)

-- Learned item→category map (grows over time; speeds up + improves categorization)
item_category_map(
  id uuid pk default gen_random_uuid(),
  user_id uuid null references auth.users,       -- null = shared default mapping
  name_normalized text not null,
  category_id uuid not null references categories,
  hits int default 1,
  updated_at timestamptz default now(),
  unique(user_id, name_normalized)
)

-- Monthly budget config (income + overall + optional per-category goals)
budgets(
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users,
  period_month date not null,                    -- first day of month
  monthly_income integer,                        -- yen
  total_budget integer,                          -- yen
  created_at timestamptz default now(),
  unique(user_id, period_month)
)

budget_goals(
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users,
  category_id uuid references categories,        -- null = applies to overall
  period_month date not null,
  limit_amount integer not null,                 -- yen
  unique(user_id, category_id, period_month)
)
```

Notes
- **JPY is integer yen** everywhere — no floating point, no cents. (Currency abstracted via `profiles.currency` for future-proofing.)
- Indexes: `receipts(user_id, purchased_at)`, `receipt_items(user_id, category_id)`, `item_category_map(user_id, name_normalized)`.
- Monthly aggregates can be SQL views or computed in `lib/budget/aggregate.ts`; start with on-the-fly queries, add a materialized view only if needed.

---

## 4. Screens / pages

| Screen | Purpose | Key UI |
|---|---|---|
| **Login** | Supabase Auth (magic link / OAuth) | shadcn form |
| **Dashboard** (home) | This month at a glance | Budget gauge, "sweets this month / コンビニ this month" cards, income vs spend, **friendly feedback banner** |
| **Scan** | Capture/upload receipt | Camera (`capture="environment"`), preview, compress, upload + processing spinner |
| **Review** | Verify/correct extracted data before saving | Editable store/date/total, item rows with category pickers, confirm button |
| **Receipts** | History | Filterable list (by month, store kind, category) |
| **Receipt detail** | One receipt | Image + line items + categories |
| **Insights** | Trends over time | Spend-by-category, sweets/conbini trend lines, month-over-month |
| **Budget settings** | Income + goals | Monthly income, total budget, per-category limits (esp. sweets & conbini) |
| **Categories** | Manage categories & store mappings | Add/edit categories, fix store→kind mappings |

Default categories (seed): `sweets (お菓子)`, `beverages (飲料)`, `groceries (食料品)`, `prepared_food (惣菜/弁当)`, `household (日用品)`, `dining (外食)`, `other (その他)`. `sweets.is_sweet = true`.

---

## 5. MVP features (scope cut)

**In MVP**
1. Auth (Supabase).
2. Scan receipt → upload → Claude vision extraction → **review/edit** → save.
3. Auto-categorize items (sweets vs not) + classify store (conbini vs not).
4. Set monthly income + total budget + a **sweets goal** and a **conbini goal**.
5. Dashboard: month total vs budget, sweets total, conbini total, simple over/under indicator.
6. Friendly feedback banner (rule-based to start).
7. Receipt history + detail.

**Deferred (post-MVP)**
- Background/async processing queue.
- LLM-personalized feedback messages.
- Insights/trend charts beyond the basics.
- Multi-currency, shared/household budgets, recurring-expense detection, export.
- Learned-mapping UI ("always categorize X as Y").

---

## 6. OCR strategy

**Primary (MVP): vision LLM end-to-end with Claude Opus 4.8.**
- Send the (downscaled) receipt image to `claude-opus-4-8` with a **structured-output JSON schema** describing the receipt: `store_name`, `purchased_at`, `total_amount`, `currency`, and `items[] { name, quantity, unit_price, amount, suggested_category }`.
- One call returns clean, validated JSON — extraction **and** a first-pass category suggestion per item. No separate OCR step, no regex parsing of free text.
- Built for **Japanese**: prompt the model to keep original Japanese item names, parse `年/月/日` dates, treat amounts as JPY integer yen, and handle tax-included (税込) / 8% vs 10% lines.
- Store the full model output in `receipts.ocr_raw` for debugging and to populate `ocr_confidence`.
- Keep `effort` low/medium (mechanical task) and stream if output is large; cap image resolution to control image tokens.

**Reliability**
- Validate against the schema; if the model can't read it (blurry, partial), set `status = pending_review` with low confidence and surface fields for manual entry rather than failing hard.
- Always route through the **review screen** in MVP — user confirms before data counts toward budgets. This turns OCR mistakes into one-tap fixes.

**Optional augmentation (post-MVP, if accuracy demands it):** add **Google Cloud Vision** (strong Japanese OCR) or **Azure Document Intelligence** (prebuilt receipt model, supports Japanese) as a raw-text pre-pass, then have the LLM structure that text. Adds robustness on poor scans at extra cost/complexity — not needed for MVP.

---

## 7. Categorization strategy

**Hybrid: learned cache → LLM suggestion → user correction, with a separate store classifier.**

Item-level:
1. **Normalize** the item name (trim, width-normalize 全角/半角, lowercase Latin).
2. **Cache lookup** in `item_category_map` (user's own mapping first, then shared defaults). Hit → assign instantly, free, deterministic.
3. **LLM suggestion**: the extraction call already returns `suggested_category` per item — use it when the cache misses. (Constrain it to the known category slugs via the schema `enum`.)
4. **Rules** (`lib/categorize/rules.ts`) as a cheap backstop / override for obvious keywords (チョコ/ガム/アイス → sweets, etc.).
5. **User correction** on the review screen is the source of truth; every confirmed correction **writes back** to `item_category_map` (incrementing `hits`), so the system gets better per-user over time.

`is_sweet` is derived from the resolved category's `is_sweet` flag → fast sweets totals.

Store-level (for conbini tracking, independent of items):
- Normalize `store_name` → match against `store_categories` patterns (seed with major chains: セブン-イレブン, ファミリーマート, ローソン, etc.).
- Set `receipts.store_kind` + `is_convenience`. Unknown stores → ask the LLM to classify the store kind during extraction, default to `other`, let the user fix it (correction seeds the mapping).

This gives both required axes: **sweets** (item category) and **convenience-store** (store kind).

---

## 8. Implementation order

**Phase 0 — Foundation**
1. `create-next-app` (TS, App Router, Tailwind), init **shadcn/ui**, set up ESLint/Prettier.
2. Supabase project; `@supabase/ssr` clients (browser/server/admin); `.env.local.example`.
3. Auth: login page, callback route, middleware session refresh + route guard.

**Phase 1 — Data layer**
4. SQL migrations: all tables + indexes + **RLS policies**.
5. Seed default categories + store_categories (major JP chains).
6. Supabase Storage bucket for receipt images (per-user path + policy).

**Phase 2 — Capture & extract (core loop)**
7. Scan page: camera capture, client-side downscale/compress, signed upload to Storage.
8. `lib/ai/` : Anthropic client + `receipt-schema.ts` (zod + JSON schema) + `extract-receipt.ts`.
9. `/api/receipts/process` route (Node runtime): download image → Claude vision → categorize (`lib/categorize`) → write `receipts` + `receipt_items` as `pending_review`.
10. Review screen: edit fields/items/categories → confirm (`status = confirmed`) → write learned mappings.

**Phase 3 — Budget & dashboard**
11. Budget settings: income, total budget, sweets goal, conbini goal.
12. `lib/budget/aggregate.ts`: monthly rollups (total, sweets, conbini, per-category).
13. Dashboard: budget gauge, sweets/conbini cards, over/under indicator.
14. `lib/budget/feedback.ts`: rule-based friendly messages (tone: encouraging, non-judgmental, gamified).

**Phase 4 — History & polish**
15. Receipts list + detail; categories/store management screens.
16. Empty/loading/error states, ja-JP formatting, basic insights chart.
17. PWA niceties (installable, mobile-first), deploy to **Vercel** (env vars, Supabase prod).

**Phase 5 — Post-MVP (as needed)**
18. Async processing queue; LLM-personalized feedback; richer insights; optional dedicated OCR augmentation.

---

## Confirmed decisions (locked 2026-06-23)
1. **Locale/currency: Japanese / JPY** — ja-JP UI, integer-yen amounts, OCR tuned for Japanese receipts.
2. **Auth: magic link** (Supabase email passwordless) for MVP.
3. **Review flow: always manual review** — every scan opens an edit/confirm screen before it counts toward budgets.
4. **AI provider: Claude only** — `claude-opus-4-8` vision does extraction + categorization in one call (no separate OCR service in MVP).
