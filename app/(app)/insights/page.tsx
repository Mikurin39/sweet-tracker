import { formatMonth } from "@/lib/format";
import { tokyoMonthBounds } from "@/lib/budget/aggregate";
import { getCategoryBreakdown, getRecentTrend } from "@/lib/budget/insights";
import { CategoryBars } from "@/components/insights/category-bars";
import { TrendList } from "@/components/insights/trend-list";

export default async function InsightsPage() {
  const bounds = tokyoMonthBounds();
  const [breakdown, trend] = await Promise.all([
    getCategoryBreakdown(bounds),
    getRecentTrend(6),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">分析</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">
          カテゴリ別（{formatMonth(bounds.periodMonth)}）
        </h2>
        <CategoryBars data={breakdown} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">推移（過去6ヶ月）</h2>
        <TrendList data={trend} />
      </section>
    </div>
  );
}
