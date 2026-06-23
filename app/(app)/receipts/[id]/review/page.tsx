import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ReceiptEditor,
  type EditorCategory,
} from "@/components/receipt/receipt-editor";
import { confirmReceipt } from "./actions";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select(
      "id, user_id, store_name, purchased_at, total_amount, status, ocr_confidence",
    )
    .eq("id", id)
    .single();

  if (!receipt) notFound();
  if (receipt.status === "confirmed") redirect(`/receipts/${id}`);

  const [{ data: items }, { data: categories }] = await Promise.all([
    supabase
      .from("receipt_items")
      .select("name, amount, category_id")
      .eq("receipt_id", id)
      .order("created_at"),
    supabase
      .from("categories")
      .select("id, slug, name, sort, user_id")
      .or(
        `user_id.eq.${receipt.user_id ?? "00000000-0000-0000-0000-000000000000"},user_id.is.null`,
      )
      .order("sort"),
  ]);

  // Dedupe categories by slug, preferring the user's own override.
  const bySlug = new Map<string, EditorCategory>();
  for (const c of (categories ?? []).sort((a, b) =>
    a.user_id === null ? -1 : b.user_id === null ? 1 : 0,
  )) {
    bySlug.set(c.slug, { id: c.id, name: c.name });
  }
  const editorCategories = [...bySlug.values()];

  const lowConfidence =
    receipt.ocr_confidence != null && receipt.ocr_confidence < 0.6;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">内容を確認</h1>
        <p className="text-muted-foreground text-sm">
          読み取り結果を確認・修正して保存してください。修正したカテゴリは次回以降に学習されます。
        </p>
        {lowConfidence && (
          <p className="mt-2 text-sm text-amber-600">
            読み取りの自信度が低めです。内容をよくご確認ください。
          </p>
        )}
      </div>

      <ReceiptEditor
        receiptId={receipt.id}
        initial={{
          store_name: receipt.store_name,
          purchased_at: receipt.purchased_at,
          total_amount: receipt.total_amount,
        }}
        initialItems={(items ?? []).map((i) => ({
          name: i.name,
          amount: i.amount,
          category_id: i.category_id,
        }))}
        categories={editorCategories}
        action={confirmReceipt}
      />
    </div>
  );
}
