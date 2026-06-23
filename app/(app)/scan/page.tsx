import { ReceiptCapture } from "@/components/scan/receipt-capture";

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">スキャン</h1>
        <p className="text-muted-foreground text-sm">
          レシートを撮影すると、品目・金額・日付・店舗を自動で読み取り、カテゴリを推定します。
        </p>
      </div>
      <ReceiptCapture />
    </div>
  );
}
