import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatYen, formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  processing: "解析中",
  pending_review: "確認待ち",
  confirmed: "確定",
  failed: "失敗",
};

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: receipts } = await supabase
    .from("receipts")
    .select(
      "id, store_name, purchased_at, total_amount, status, is_convenience",
    )
    .order("purchased_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = receipts ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">履歴</h1>
        <Link
          href="/scan"
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm"
        >
          ＋ スキャン
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          まだレシートがありません。「スキャン」から追加してください。
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => {
            const needsReview =
              r.status === "pending_review" || r.status === "processing";
            const href = needsReview
              ? `/receipts/${r.id}/review`
              : `/receipts/${r.id}`;
            return (
              <li key={r.id}>
                <Link
                  href={href}
                  className="hover:bg-accent flex items-center justify-between px-4 py-3"
                >
                  <span className="flex flex-col">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {r.store_name ?? "（店舗名なし）"}
                      {r.is_convenience && (
                        <span className="rounded-full bg-sky-100 px-1.5 text-xs text-sky-700">
                          コンビニ
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {r.purchased_at ? formatDate(r.purchased_at) : "日付不明"}
                      {" ・ "}
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </span>
                  <span className="text-sm">
                    {r.total_amount != null ? formatYen(r.total_amount) : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
