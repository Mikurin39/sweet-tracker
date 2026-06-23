"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BudgetInput = {
  periodMonth: string; // YYYY-MM-DD (first of month)
  monthly_income: number | null;
  total_budget: number | null;
  sweets_budget: number | null;
  convenience_budget: number | null;
};

export async function saveBudget(input: BudgetInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      period_month: input.periodMonth,
      monthly_income: input.monthly_income,
      total_budget: input.total_budget,
      sweets_budget: input.sweets_budget,
      convenience_budget: input.convenience_budget,
    },
    { onConflict: "user_id,period_month" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/settings/budget");
}
