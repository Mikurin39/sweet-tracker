import { createClient } from "@/lib/supabase/server";

export type MonthBounds = {
  start: string; // YYYY-MM-DD (first day)
  end: string; // YYYY-MM-DD (last day)
  periodMonth: string; // = start, used as budgets.period_month
};

export type MonthlySummary = {
  monthTotal: number;
  sweetsTotal: number;
  convenienceTotal: number;
  receiptCount: number;
};

export type MonthlyBudget = {
  monthly_income: number | null;
  total_budget: number | null;
  sweets_budget: number | null;
  convenience_budget: number | null;
};

/** Bounds of the current month in Asia/Tokyo (date-only). */
export function tokyoMonthBounds(now = new Date()): MonthBounds {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value); // 1-based

  const mm = String(month).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, periodMonth: start };
}

/** Sum confirmed spending for the month: total, sweets, convenience. */
export async function getMonthlySummary(
  bounds: MonthBounds,
): Promise<MonthlySummary> {
  const supabase = await createClient();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, total_amount, is_convenience")
    .eq("status", "confirmed")
    .gte("purchased_at", bounds.start)
    .lte("purchased_at", bounds.end);

  const rows = receipts ?? [];
  const ids = rows.map((r) => r.id);

  let sweetsTotal = 0;
  if (ids.length) {
    const { data: items } = await supabase
      .from("receipt_items")
      .select("amount")
      .in("receipt_id", ids)
      .eq("is_sweet", true);
    sweetsTotal = (items ?? []).reduce((acc, i) => acc + (i.amount ?? 0), 0);
  }

  const monthTotal = rows.reduce((acc, r) => acc + (r.total_amount ?? 0), 0);
  const convenienceTotal = rows
    .filter((r) => r.is_convenience)
    .reduce((acc, r) => acc + (r.total_amount ?? 0), 0);

  return {
    monthTotal,
    sweetsTotal,
    convenienceTotal,
    receiptCount: rows.length,
  };
}

/** Load the budget row for a given period month (null if not set). */
export async function getMonthlyBudget(
  periodMonth: string,
): Promise<MonthlyBudget | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("budgets")
    .select("monthly_income, total_budget, sweets_budget, convenience_budget")
    .eq("period_month", periodMonth)
    .maybeSingle();
  return data ?? null;
}
