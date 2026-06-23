"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addCategory,
  deleteCategory,
} from "@/app/(app)/settings/categories/actions";

export type ManagedCategory = {
  id: string;
  name: string;
  is_sweet: boolean;
  editable: boolean;
};

export function CategoryManager({
  categories,
}: {
  categories: ManagedCategory[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSweet, setIsSweet] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addCategory({ name, isSweet });
      setName("");
      setIsSweet(false);
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
      await deleteCategory(id);
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
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-4 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              {c.is_sweet && <span>🍬</span>}
              {c.name}
              {!c.editable && (
                <span className="text-muted-foreground text-xs">標準</span>
              )}
            </span>
            {c.editable && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onDelete(c.id)}
                aria-label="削除"
              >
                ✕
              </Button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="新しいカテゴリ名"
          />
          <Button type="submit" disabled={busy}>
            追加
          </Button>
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSweet}
            onChange={(e) => setIsSweet(e.target.checked)}
          />
          お菓子として集計する
        </label>
      </form>
    </div>
  );
}
