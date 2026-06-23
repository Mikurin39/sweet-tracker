"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-muted-foreground text-sm">
        エラーが発生しました。時間をおいて再度お試しください。
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        再試行
      </Button>
    </div>
  );
}
