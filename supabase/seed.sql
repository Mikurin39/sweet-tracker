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
