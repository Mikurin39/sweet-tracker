import type { CategorySlug, StoreKind } from "@/lib/ai/receipt-schema";
import { normalizeText } from "./normalize";
import { matchItemRule } from "./rules";

export type StoreRow = {
  match_pattern: string;
  store_kind: string;
  is_convenience: boolean;
};

/**
 * Resolve a store's kind and whether it's a convenience store.
 * Pattern match against known stores wins; otherwise fall back to the
 * model's inferred kind.
 */
export function resolveStore(
  storeName: string | null,
  modelKind: StoreKind,
  storeRows: StoreRow[],
): { store_kind: string; is_convenience: boolean } {
  if (storeName) {
    const n = normalizeText(storeName);
    for (const row of storeRows) {
      if (n.includes(row.match_pattern)) {
        return {
          store_kind: row.store_kind,
          is_convenience: row.is_convenience,
        };
      }
    }
  }
  return { store_kind: modelKind, is_convenience: modelKind === "convenience" };
}

/**
 * Resolve an item's category slug. The model's suggestion is trusted; keyword
 * rules only rescue items the model couldn't categorize ("other").
 * (Learned per-user cache is applied earlier, in the caller.)
 */
export function resolveItemSlug(
  normalizedName: string,
  suggested: CategorySlug,
): CategorySlug {
  if (suggested === "other") {
    const rule = matchItemRule(normalizedName);
    if (rule) return rule;
  }
  return suggested;
}
