import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractReceipt,
  type ReceiptImageMediaType,
} from "@/lib/ai/extract-receipt";
import { normalizeText } from "@/lib/categorize/normalize";
import { resolveStore, resolveItemSlug } from "@/lib/categorize/resolve";

export const runtime = "nodejs";
export const maxDuration = 60;

function mediaTypeFromPath(path: string): ReceiptImageMediaType {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let path: string | undefined;
  try {
    const body = await req.json();
    path = body?.path;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Path must live under the user's own folder.
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  // Create the receipt row up front so we can mark it failed on error.
  const { data: receipt, error: insErr } = await supabase
    .from("receipts")
    .insert({ user_id: user.id, image_path: path, status: "processing" })
    .select("id")
    .single();
  if (insErr || !receipt) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  const receiptId = receipt.id as string;

  try {
    // 1. Download the uploaded image (RLS allows the owner's folder).
    const { data: blob, error: dlErr } = await supabase.storage
      .from("receipts")
      .download(path);
    if (dlErr || !blob) throw new Error("画像のダウンロードに失敗しました");
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

    // 2. Vision extraction.
    const extraction = await extractReceipt({
      base64,
      mediaType: mediaTypeFromPath(path),
    });

    // 3. Prefetch reference data for categorization.
    const orOwnOrGlobal = `user_id.eq.${user.id},user_id.is.null`;
    const names = [
      ...new Set(extraction.items.map((i) => normalizeText(i.name))),
    ];

    const [{ data: categories }, { data: storeRows }, { data: learned }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id, slug, is_sweet, user_id")
          .or(orOwnOrGlobal),
        supabase
          .from("store_categories")
          .select("match_pattern, store_kind, is_convenience")
          .or(orOwnOrGlobal),
        names.length
          ? supabase
              .from("item_category_map")
              .select("name_normalized, category_id, user_id")
              .in("name_normalized", names)
              .or(orOwnOrGlobal)
          : Promise.resolve({ data: [] as never[] }),
      ]);

    // slug -> category (user rows override globals); id -> category.
    const catBySlug = new Map<string, { id: string; is_sweet: boolean }>();
    const catById = new Map<string, { is_sweet: boolean }>();
    for (const c of (categories ?? []).sort((a, b) =>
      a.user_id === null ? -1 : b.user_id === null ? 1 : 0,
    )) {
      catBySlug.set(c.slug, { id: c.id, is_sweet: c.is_sweet });
      catById.set(c.id, { is_sweet: c.is_sweet });
    }

    // normalized name -> learned category_id (user mapping overrides global).
    const learnedByName = new Map<string, string>();
    for (const row of learned ?? []) {
      if (row.user_id === null && learnedByName.has(row.name_normalized))
        continue;
      learnedByName.set(row.name_normalized, row.category_id);
    }

    // 4. Resolve store + items.
    const store = resolveStore(
      extraction.store_name,
      extraction.store_kind,
      storeRows ?? [],
    );

    const itemsToInsert = extraction.items.map((item) => {
      const n = normalizeText(item.name);
      let categoryId: string | null = null;
      let isSweet = false;

      const learnedId = learnedByName.get(n);
      if (learnedId && catById.has(learnedId)) {
        categoryId = learnedId;
        isSweet = catById.get(learnedId)!.is_sweet;
      } else {
        const slug = resolveItemSlug(n, item.suggested_category);
        const cat = catBySlug.get(slug) ?? catBySlug.get("other");
        if (cat) {
          categoryId = cat.id;
          isSweet = cat.is_sweet;
        }
      }

      return {
        receipt_id: receiptId,
        user_id: user.id,
        name: item.name,
        name_normalized: n,
        quantity: item.quantity ?? 1,
        unit_price:
          item.unit_price != null ? Math.round(item.unit_price) : null,
        amount: Math.round(item.amount),
        category_id: categoryId,
        is_sweet: isSweet,
        source: "ocr",
      };
    });

    // 5. Persist results; ready for review.
    await supabase
      .from("receipts")
      .update({
        store_name: extraction.store_name,
        store_name_normalized: extraction.store_name
          ? normalizeText(extraction.store_name)
          : null,
        store_kind: store.store_kind,
        is_convenience: store.is_convenience,
        purchased_at: extraction.purchased_at,
        total_amount:
          extraction.total_amount != null
            ? Math.round(extraction.total_amount)
            : null,
        currency: extraction.currency || "JPY",
        ocr_confidence: extraction.confidence,
        ocr_raw: extraction,
        status: "pending_review",
      })
      .eq("id", receiptId);

    if (itemsToInsert.length) {
      await supabase.from("receipt_items").insert(itemsToInsert);
    }

    return NextResponse.json({ receiptId });
  } catch (err) {
    await supabase
      .from("receipts")
      .update({ status: "failed" })
      .eq("id", receiptId);
    console.error("receipt processing failed", err);
    return NextResponse.json(
      { error: "processing_failed", receiptId },
      { status: 500 },
    );
  }
}
