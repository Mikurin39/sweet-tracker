import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-muted-foreground text-sm">
        ページが見つかりませんでした。
      </p>
      <Link href="/dashboard" className="text-sm underline">
        ホームへ戻る
      </Link>
    </div>
  );
}
