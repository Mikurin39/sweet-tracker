import { formatYen } from "@/lib/format";
import type { TrendPoint } from "@/lib/budget/insights";

export function TrendList({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((p) => (
        <li key={p.month} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{p.label}</span>
            <span>{formatYen(p.total)}</span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${(p.total / max) * 100}%` }}
            />
          </div>
          <div className="text-muted-foreground flex gap-4 text-xs">
            <span>🍬 お菓子 {formatYen(p.sweets)}</span>
            <span>🏪 コンビニ {formatYen(p.convenience)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
