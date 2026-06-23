import type { CategorySlug } from "@/lib/ai/receipt-schema";
import { normalizeText } from "./normalize";

/**
 * High-signal keyword rules. Used only as a backstop when the model is
 * non-committal (returns "other"), to rescue obvious items. Keep the list
 * conservative to avoid false positives.
 */
const RAW_RULES: { keyword: string; slug: CategorySlug }[] = [
  // sweets
  { keyword: "チョコ", slug: "sweets" },
  { keyword: "クッキー", slug: "sweets" },
  { keyword: "ビスケット", slug: "sweets" },
  { keyword: "キャンディ", slug: "sweets" },
  { keyword: "ガム", slug: "sweets" },
  { keyword: "グミ", slug: "sweets" },
  { keyword: "スナック", slug: "sweets" },
  { keyword: "ポテトチップ", slug: "sweets" },
  { keyword: "アイス", slug: "sweets" },
  { keyword: "せんべい", slug: "sweets" },
  { keyword: "ケーキ", slug: "sweets" },
  // household
  { keyword: "ティッシュ", slug: "household" },
  { keyword: "洗剤", slug: "household" },
  { keyword: "シャンプー", slug: "household" },
  { keyword: "トイレットペーパー", slug: "household" },
];

const RULES = RAW_RULES.map((r) => ({
  ...r,
  keyword: normalizeText(r.keyword),
}));

/** Returns a category slug if a keyword rule matches the normalized name. */
export function matchItemRule(normalizedName: string): CategorySlug | null {
  for (const rule of RULES) {
    if (normalizedName.includes(rule.keyword)) return rule.slug;
  }
  return null;
}
