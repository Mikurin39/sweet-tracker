-- Headline trackers for the MVP: sweets (item-category) and convenience
-- (store-kind) budgets live directly on the monthly budget row.
alter table public.budgets
  add column if not exists sweets_budget      integer,
  add column if not exists convenience_budget integer;
