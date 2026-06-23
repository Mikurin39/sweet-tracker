"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetInput } from "@/app/(app)/settings/budget/actions";

type Initial = {
  monthly_income: number | null;
  total_budget: number | null;
  sweets_budget: number | null;
  convenience_budget: number | null;
} | null;

type Props = {
  periodMonth: string;
  initial: Initial;
  action: (input: BudgetInput) => Promise<void>;
};

const toStr = (n: number | null | undefined) => (n != null ? String(n) : "");
const toNum = (s: string) =>
  s.trim() === "" ? null : Math.max(0, Math.round(Number(s)) || 0);

export function BudgetForm({ periodMonth, initial, action }: Props) {
  const router = useRouter();
  const [income, setIncome] = useState(toStr(initial?.monthly_income));
  const [total, setTotal] = useState(toStr(initial?.total_budget));
  const [sweets, setSweets] = useState(toStr(initial?.sweets_budget));
  const [conv, setConv] = useState(toStr(initial?.convenience_budget));
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await action({
        periodMonth,
        monthly_income: toNum(income),
        total_budget: toNum(total),
        sweets_budget: toNum(sweets),
        convenience_budget: toNum(conv),
      });
      toast.success("保存しました");
      router.push("/dashboard");
    } catch {
      setSaving(false);
      toast.error("保存に失敗しました");
    }
  }

  const fields: {
    id: string;
    label: string;
    value: string;
    set: (v: string) => void;
    hint?: string;
  }[] = [
    { id: "income", label: "月収（円）", value: income, set: setIncome },
    { id: "total", label: "今月の予算（円）", value: total, set: setTotal },
    {
      id: "sweets",
      label: "お菓子の予算（円）",
      value: sweets,
      set: setSweets,
    },
    {
      id: "conv",
      label: "コンビニの予算（円）",
      value: conv,
      set: setConv,
    },
  ];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {fields.map((f) => (
        <div key={f.id} className="flex flex-col gap-2">
          <Label htmlFor={f.id}>{f.label}</Label>
          <Input
            id={f.id}
            type="number"
            inputMode="numeric"
            min={0}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            placeholder="未設定"
          />
        </div>
      ))}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  );
}
