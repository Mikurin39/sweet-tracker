import { z } from "zod";

/** Category slugs (must match seeded `categories.slug`). */
export const CATEGORY_SLUGS = [
  "sweets",
  "beverages",
  "groceries",
  "prepared_food",
  "dining",
  "household",
  "other",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** Store kinds the model may infer. */
export const STORE_KINDS = [
  "convenience",
  "supermarket",
  "drugstore",
  "restaurant",
  "other",
] as const;
export type StoreKind = (typeof STORE_KINDS)[number];

// NOTE: structured outputs do not support numeric/length constraints, so we
// keep the schema to plain types + enums + .nullable() (never .optional()).
export const ReceiptItemSchema = z.object({
  name: z.string().describe("商品名（レシート表記のまま、日本語可）"),
  quantity: z.number().describe("数量。不明な場合は 1"),
  unit_price: z.number().nullable().describe("単価（円・整数）。不明なら null"),
  amount: z
    .number()
    .describe("この明細の合計金額（円・整数、税込があれば税込）"),
  suggested_category: z.enum(CATEGORY_SLUGS).describe("商品カテゴリの推定"),
});

export const ReceiptExtractionSchema = z.object({
  store_name: z.string().nullable().describe("店舗名。読み取れなければ null"),
  store_kind: z.enum(STORE_KINDS).describe("店舗種別の推定"),
  purchased_at: z
    .string()
    .nullable()
    .describe("購入日 YYYY-MM-DD（和暦は西暦に変換）。不明なら null"),
  total_amount: z
    .number()
    .nullable()
    .describe("合計金額（円・整数、税込）。不明なら null"),
  currency: z.string().describe("通貨コード。日本のレシートは 'JPY'"),
  items: z.array(ReceiptItemSchema).describe("購入した商品の明細"),
  confidence: z.number().describe("読み取りの自信度 0〜1"),
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;
export type ReceiptItemExtraction = z.infer<typeof ReceiptItemSchema>;
