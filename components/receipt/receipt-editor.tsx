"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatYen } from "@/lib/format";
import type { ConfirmPayload } from "@/app/(app)/receipts/[id]/review/actions";

export type EditorCategory = { id: string; name: string };

type EditorItem = {
  key: string;
  name: string;
  amount: string;
  category_id: string | null;
};

type Props = {
  receiptId: string;
  initial: {
    store_name: string | null;
    purchased_at: string | null;
    total_amount: number | null;
  };
  initialItems: { name: string; amount: number; category_id: string | null }[];
  categories: EditorCategory[];
  action: (payload: ConfirmPayload) => Promise<void>;
};

let keySeq = 0;
const nextKey = () => `item-${keySeq++}`;

export function ReceiptEditor({
  receiptId,
  initial,
  initialItems,
  categories,
  action,
}: Props) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(initial.store_name ?? "");
  const [purchasedAt, setPurchasedAt] = useState(initial.purchased_at ?? "");
  const [total, setTotal] = useState(
    initial.total_amount != null ? String(initial.total_amount) : "",
  );
  const [items, setItems] = useState<EditorItem[]>(
    initialItems.map((i) => ({
      key: nextKey(),
      name: i.name,
      amount: String(i.amount),
      category_id: i.category_id,
    })),
  );
  const [saving, setSaving] = useState(false);

  const itemsSum = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  function updateItem(key: string, patch: Partial<EditorItem>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: nextKey(), name: "", amount: "", category_id: null },
    ]);
  }

  async function onConfirm() {
    setSaving(true);
    try {
      await action({
        receiptId,
        store_name: storeName.trim() || null,
        purchased_at: purchasedAt || null,
        total_amount: total === "" ? null : Math.round(Number(total)) || 0,
        items: items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({
            name: i.name.trim(),
            amount: Math.round(Number(i.amount)) || 0,
            category_id: i.category_id,
          })),
      });
      toast.success("保存しました");
      router.push(`/receipts/${receiptId}`);
    } catch {
      setSaving(false);
      toast.error("保存に失敗しました");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="store">店舗名</Label>
          <Input
            id="store"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="例: セブン-イレブン"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">購入日</Label>
          <Input
            id="date"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="total">合計金額（円）</Label>
          <Input
            id="total"
            type="number"
            inputMode="numeric"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">品目</h2>
          <span className="text-muted-foreground text-sm">
            明細合計: {formatYen(itemsSum)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <Input
                aria-label="品名"
                className="flex-1"
                value={item.name}
                onChange={(e) => updateItem(item.key, { name: e.target.value })}
                placeholder="品名"
              />
              <Input
                aria-label="金額"
                type="number"
                inputMode="numeric"
                className="w-24"
                value={item.amount}
                onChange={(e) =>
                  updateItem(item.key, { amount: e.target.value })
                }
                placeholder="0"
              />
              <select
                aria-label="カテゴリ"
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={item.category_id ?? ""}
                onChange={(e) =>
                  updateItem(item.key, {
                    category_id: e.target.value || null,
                  })
                }
              >
                <option value="">未分類</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.key)}
                aria-label="削除"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          ＋ 品目を追加
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onConfirm} disabled={saving}>
          {saving ? "保存中…" : "確定して保存"}
        </Button>
      </div>
    </div>
  );
}
