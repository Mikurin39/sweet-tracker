import { createClient } from "@/lib/supabase/server";
import { tokyoMonthBounds, type MonthBounds } from "./aggregate";

export type CategoryTotal = { name: string; total: number; isSweet: boolean };

export type TrendPoint = {
  month: string; // YYYY-MM
  label: string; // e.g. 6月
  total: number;
  sweets: number;
  convenience: number;
};

/** Spend by category for confirmed receipts in the given month. */
export async function getCategoryBreakdown(
  bounds: MonthBounds,
): Promise<CategoryTotal[]> {
  const supabase = await createClient();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id")
    .eq("status", "confirmed")
    .gte("purchased_at", bounds.start)
    .lte("purchased_at", bounds.end);

  const ids = (receipts ?? []).map((r) => r.id);
  if (!ids.length) return [];

  const { data: items } = await supabase
    .from("receipt_items")
    .select("amount, is_sweet, categories(name)")
    .in("receipt_id", ids);

  const map = new Map<string, { total: number; isSweet: boolean }>();
  for (const it of items ?? []) {
    // Without generated DB types, supabase-js types the embed as an array even
    // for a to-one relation (runtime returns a single object). Handle both.
    const cat = it.categories as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const name = (Array.isArray(cat) ? cat[0]?.name : cat?.name) ?? "未分類";
    const cur = map.get(name) ?? { total: 0, isSweet: false };
    cur.total += it.amount ?? 0;
    if (it.is_sweet) cur.isSweet = true;
    map.set(name, cur);
  }

  return [...map]
    .map(([name, v]) => ({ name, total: v.total, isSweet: v.isSweet }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Total / sweets / convenience spend for each of the last N months. */
export async function getRecentTrend(monthsBack = 6): Promise<TrendPoint[]> {
  const supabase = await createClient();

  const { periodMonth } = tokyoMonthBounds();
  const [cy, cm] = periodMonth.split("-").map(Number); // cm is 1-based
  let sy = cy;
  let sm = cm - (monthsBack - 1);
  while (sm <= 0) {
    sm += 12;
    sy -= 1;
  }
  const startStr = `${sy}-${String(sm).padStart(2, "0")}-01`;

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, purchased_at, total_amount, is_convenience")
    .eq("status", "confirmed")
    .gte("purchased_at", startStr);

  const rows = receipts ?? [];
  const ids = rows.map((r) => r.id);
  const purchasedById = new Map(rows.map((r) => [r.id, r.purchased_at]));

  let sweetItems: { receipt_id: string; amount: number | null }[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("receipt_items")
      .select("receipt_id, amount")
      .in("receipt_id", ids)
      .eq("is_sweet", true);
    sweetItems = data ?? [];
  }

  // Initialize one bucket per month so empty months still appear.
  const buckets = new Map<string, TrendPoint>();
  for (let i = 0; i < monthsBack; i++) {
    let y = sy;
    let m = sm + i;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    const key = `${y}-${String(m).padStart(2, "0")}`;
    buckets.set(key, {
      month: key,
      label: `${m}月`,
      total: 0,
      sweets: 0,
      convenience: 0,
    });
  }

  for (const r of rows) {
    if (!r.purchased_at) continue;
    const b = buckets.get(String(r.purchased_at).slice(0, 7));
    if (!b) continue;
    b.total += r.total_amount ?? 0;
    if (r.is_convenience) b.convenience += r.total_amount ?? 0;
  }
  for (const it of sweetItems) {
    const pa = purchasedById.get(it.receipt_id);
    if (!pa) continue;
    const b = buckets.get(String(pa).slice(0, 7));
    if (!b) continue;
    b.sweets += it.amount ?? 0;
  }

  return [...buckets.values()];
}
