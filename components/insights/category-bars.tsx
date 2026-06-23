import { formatYen } from "@/lib/format";
import type { CategoryTotal } from "@/lib/budget/insights";

export function CategoryBars({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        今月の確定データがありません。
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ul className="flex flex-col gap-2">
      {data.map((c) => (
        <li key={c.name} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              {c.isSweet && <span>🍬</span>}
              {c.name}
            </span>
            <span className="text-muted-foreground">{formatYen(c.total)}</span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className={
                c.isSweet ? "h-full bg-amber-500" : "h-full bg-sky-500"
              }
              style={{ width: `${(c.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
