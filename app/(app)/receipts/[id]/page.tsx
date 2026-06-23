import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatYen, formatDate } from "@/lib/format";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select(
      "id, store_name, purchased_at, total_amount, status, store_kind, is_convenience",
    )
    .eq("id", id)
    .single();

  if (!receipt) notFound();
  // Not yet reviewed → send to the review screen.
  if (receipt.status === "processing" || receipt.status === "pending_review") {
    redirect(`/receipts/${id}/review`);
  }

  const { data: items } = await supabase
    .from("receipt_items")
    .select("id, name, amount, is_sweet, categories(name)")
    .eq("receipt_id", id)
    .order("created_at");

  const rows = items ?? [];
  const sweetsTotal = rows
    .filter((i) => i.is_sweet)
    .reduce((acc, i) => acc + (i.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {receipt.store_name ?? "（店舗名なし）"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {receipt.purchased_at
              ? formatDate(receipt.purchased_at)
              : "日付不明"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {receipt.is_convenience && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
              コンビニ
            </span>
          )}
          {receipt.status === "failed" && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              解析失敗
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <ul className="divide-y">
          {rows.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between px-4 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                {i.name}
                {i.is_sweet && <span title="お菓子">🍬</span>}
              </span>
              <span className="text-muted-foreground text-sm">
                {formatYen(i.amount ?? 0)}
              </span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-muted-foreground px-4 py-3 text-sm">
              品目はありません。
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">お菓子の合計</span>
          <span>{formatYen(sweetsTotal)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>合計</span>
          <span>{formatYen(receipt.total_amount ?? 0)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/receipts/${id}/review`}
          className="text-muted-foreground text-sm underline"
        >
          編集する
        </Link>
        <Link
          href="/receipts"
          className="text-muted-foreground text-sm underline"
        >
          履歴へ戻る
        </Link>
      </div>
    </div>
  );
}
