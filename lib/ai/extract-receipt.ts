import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./anthropic";
import {
  ReceiptExtractionSchema,
  type ReceiptExtraction,
} from "./receipt-schema";

export type ReceiptImageMediaType = "image/jpeg" | "image/png" | "image/webp";

const EXTRACTION_PROMPT = `あなたは日本のレシートを読み取るアシスタントです。画像のレシートから情報を構造化して抽出してください。

- store_name: 店舗名（例: セブン-イレブン○○店）。読み取れなければ null。
- store_kind: 店舗種別を convenience / supermarket / drugstore / restaurant / other から推定。
- purchased_at: 購入日を YYYY-MM-DD 形式で。和暦（令和など）は西暦に変換。時刻は不要。読み取れなければ null。
- total_amount: 合計金額（税込・円・整数）。読み取れなければ null。
- currency: 通貨コード。日本のレシートは 'JPY'。
- items: 各商品について name（表記のまま日本語）, quantity（数量・不明は 1）, unit_price（単価・円・整数・不明は null）, amount（その明細の金額・円・整数）, suggested_category。
- confidence: 全体の読み取り自信度 0〜1。

suggested_category の基準:
- sweets: お菓子・チョコ・スナック・アイス・ガム・あめ・クッキー等の菓子類
- beverages: 飲み物（水・お茶・ジュース・コーヒー・酒類など）
- groceries: 調理前の食材（野菜・肉・魚・卵・牛乳・調味料など）
- prepared_food: そのまま食べられる物（弁当・おにぎり・惣菜・パン・サンドイッチなど）
- dining: 飲食店での食事
- household: 日用品（ティッシュ・洗剤・トイレタリーなど）
- other: 上記に当てはまらない物

金額は必ず円単位の整数で、小数や通貨記号は含めないでください。値引き行は商品の amount に反映するか、別行として負の金額で表しても構いません。判別できない項目は other としてください。`;

/** Extract structured receipt data from an image using Claude vision. */
export async function extractReceipt(params: {
  base64: string;
  mediaType: ReceiptImageMediaType;
}): Promise<ReceiptExtraction> {
  const response = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    // Mechanical extraction — low effort keeps latency/cost down.
    output_config: {
      effort: "low",
      format: zodOutputFormat(ReceiptExtractionSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.base64,
            },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("レシートの解析に失敗しました");
  }
  return parsed;
}
