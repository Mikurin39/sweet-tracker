import Link from "next/link";
import { formatMonth, formatYen } from "@/lib/format";
import {
  tokyoMonthBounds,
  getMonthlySummary,
  getMonthlyBudget,
} from "@/lib/budget/aggregate";
import { buildFeedback } from "@/lib/budget/feedback";
import { SpendCard } from "@/components/dashboard/spend-card";
import { FeedbackBanner } from "@/components/dashboard/feedback-banner";

export default async function DashboardPage() {
  const bounds = tokyoMonthBounds();
  const [summary, budget] = await Promise.all([
    getMonthlySummary(bounds),
    getMonthlyBudget(bounds.periodMonth),
  ]);
  const feedback = buildFeedback(summary, budget);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ホーム</h1>
          <p className="text-muted-foreground text-sm">
            {formatMonth(bounds.periodMonth)}の支出
          </p>
        </div>
        <Link
          href="/settings/budget"
          className="text-muted-foreground text-sm underline"
        >
          予算設定
        </Link>
      </div>

      <FeedbackBanner feedback={feedback} />

      <SpendCard
        label="今月の合計"
        emoji="📊"
        spent={summary.monthTotal}
        budget={budget?.total_budget ?? null}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SpendCard
          label="お菓子"
          emoji="🍬"
          spent={summary.sweetsTotal}
          budget={budget?.sweets_budget ?? null}
        />
        <SpendCard
          label="コンビニ"
          emoji="🏪"
          spent={summary.convenienceTotal}
          budget={budget?.convenience_budget ?? null}
        />
      </div>

      {budget?.monthly_income != null && (
        <div className="flex justify-between rounded-lg border p-4 text-sm">
          <span className="text-muted-foreground">今月の収入</span>
          <span>
            {formatYen(budget.monthly_income)}（残り{" "}
            {formatYen(budget.monthly_income - summary.monthTotal)}）
          </span>
        </div>
      )}

      {summary.receiptCount === 0 && (
        <p className="text-muted-foreground text-sm">
          今月はまだ確定済みのレシートがありません。{" "}
          <Link href="/scan" className="underline">
            スキャン
          </Link>{" "}
          してみましょう。
        </p>
      )}
    </div>
  );
}
