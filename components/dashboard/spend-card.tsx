import { formatYen } from "@/lib/format";

export function SpendCard({
  label,
  emoji,
  spent,
  budget,
}: {
  label: string;
  emoji: string;
  spent: number;
  budget: number | null;
}) {
  const hasBudget = budget != null && budget > 0;
  const ratio = hasBudget ? spent / budget : 0;
  const pct = Math.min(ratio, 1) * 100;
  const over = hasBudget && spent > budget;
  const barColor = over
    ? "bg-red-500"
    : ratio >= 0.8
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <span className="text-muted-foreground text-sm">
        {emoji} {label}
      </span>
      <span className="text-2xl font-semibold">{formatYen(spent)}</span>
      {hasBudget ? (
        <>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs">
            予算 {formatYen(budget)} ・{" "}
            {over
              ? `${formatYen(spent - budget)} オーバー`
              : `残り ${formatYen(budget - spent)}`}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground text-xs">予算未設定</span>
      )}
    </div>
  );
}
