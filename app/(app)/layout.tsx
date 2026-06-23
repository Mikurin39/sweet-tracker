import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "ホーム" },
  { href: "/scan", label: "スキャン" },
  { href: "/receipts", label: "履歴" },
  { href: "/insights", label: "分析" },
  { href: "/settings", label: "設定" },
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already guards, but never render the
  // app shell without a user.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="font-semibold">
            レシート家計簿
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-1.5"
              >
                {item.label}
              </Link>
            ))}
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                ログアウト
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
