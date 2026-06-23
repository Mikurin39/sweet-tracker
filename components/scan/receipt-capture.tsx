"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "compressing" | "uploading" | "analyzing";

const LABELS: Record<Phase, string> = {
  idle: "レシートを撮影 / 選択",
  compressing: "画像を準備中…",
  uploading: "アップロード中…",
  analyzing: "レシートを解析中…",
};

export function ReceiptCapture() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const busy = phase !== "idle";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    try {
      setPhase("compressing");
      const blob = await compressImage(file);
      setPreview(URL.createObjectURL(blob));

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      setPhase("uploading");
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      setPhase("analyzing");
      const res = await fetch("/api/receipts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error("レシートの解析に失敗しました");
      const { receiptId } = await res.json();

      router.push(`/receipts/${receiptId}/review`);
    } catch (err) {
      setPhase("idle");
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="レシートのプレビュー"
          className="max-h-80 rounded-lg border"
        />
      )}
      <Button
        size="lg"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {LABELS[phase]}
      </Button>
      {busy && (
        <p className="text-muted-foreground text-sm">
          {LABELS[phase]} 少々お待ちください。
        </p>
      )}
    </div>
  );
}
