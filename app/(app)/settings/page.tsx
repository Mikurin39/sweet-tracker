import Link from "next/link";

const LINKS = [
  {
    href: "/settings/budget",
    label: "予算",
    desc: "収入・予算・お菓子・コンビニの上限",
  },
  {
    href: "/settings/categories",
    label: "カテゴリ",
    desc: "独自カテゴリの追加・削除",
  },
  { href: "/settings/stores", label: "店舗", desc: "店舗名と種別の対応付け" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">設定</h1>
      <ul className="divide-y rounded-lg border">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="hover:bg-accent flex flex-col px-4 py-3"
            >
              <span className="text-sm font-medium">{l.label}</span>
              <span className="text-muted-foreground text-xs">{l.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
