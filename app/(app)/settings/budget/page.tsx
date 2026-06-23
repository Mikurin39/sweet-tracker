import { formatMonth } from "@/lib/format";
import { tokyoMonthBounds, getMonthlyBudget } from "@/lib/budget/aggregate";
import { BudgetForm } from "@/components/settings/budget-form";
import { saveBudget } from "./actions";

export default async function BudgetSettingsPage() {
  const { periodMonth } = tokyoMonthBounds();
  const budget = await getMonthlyBudget(periodMonth);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">予算設定</h1>
        <p className="text-muted-foreground text-sm">
          {formatMonth(periodMonth)}
          の収入と予算を設定します。空欄の項目は未設定として扱われます。
        </p>
      </div>
      <BudgetForm
        periodMonth={periodMonth}
        initial={budget}
        action={saveBudget}
      />
    </div>
  );
}
