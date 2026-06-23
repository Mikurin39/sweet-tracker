"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addStore, deleteStore } from "@/app/(app)/settings/stores/actions";

export const KIND_LABELS: Record<string, string> = {
  convenience: "コンビニ",
  supermarket: "スーパー",
  drugstore: "ドラッグストア",
  restaurant: "飲食店",
  other: "その他",
};

export type ManagedStore = {
  id: string;
  match_pattern: string;
  store_kind: string;
  is_convenience: boolean;
  editable: boolean;
};

export function StoreManager({ stores }: { stores: ManagedStore[] }) {
  const router = useRouter();
  const [pattern, setPattern] = useState("");
  const [kind, setKind] = useState("convenience");
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim()) return;
    setBusy(true);
    try {
      await addStore({ pattern, kind });
      setPattern("");
      router.refresh();
      toast.success("追加しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    try {
      await deleteStore(id);
      router.refresh();
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {stores.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-4 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              {s.match_pattern}
              <span className="text-muted-foreground text-xs">
                {KIND_LABELS[s.store_kind] ?? s.store_kind}
              </span>
              {!s.editable && (
                <span className="text-muted-foreground text-xs">標準</span>
              )}
            </span>
            {s.editable && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onDelete(s.id)}
                aria-label="削除"
              >
                ✕
              </Button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="flex gap-2">
        <Input
          className="flex-1"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="店舗名（一部でも可）"
        />
        <select
          aria-label="種別"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {Object.entries(KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={busy}>
          追加
        </Button>
      </form>
    </div>
  );
}
