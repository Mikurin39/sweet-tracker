"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeText } from "@/lib/categorize/normalize";
import { resolveStore } from "@/lib/categorize/resolve";
import type { StoreKind } from "@/lib/ai/receipt-schema";

export type ConfirmItem = {
  name: string;
  amount: number;
  category_id: string | null;
};

export type ConfirmPayload = {
  receiptId: string;
  store_name: string | null;
  purchased_at: string | null; // YYYY-MM-DD or null
  total_amount: number | null;
  items: ConfirmItem[];
};

/**
 * Save the user-reviewed receipt: update fields, replace items, recompute
 * store/sweets flags, mark confirmed, and write learned category mappings.
 */
export async function confirmReceipt(payload: ConfirmPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const orOwnOrGlobal = `user_id.eq.${user.id},user_id.is.null`;

  // Fallback store kind = whatever the model previously inferred.
  const { data: existing } = await supabase
    .from("receipts")
    .select("store_kind")
    .eq("id", payload.receiptId)
    .eq("user_id", user.id)
    .single();
  const fallbackKind = (existing?.store_kind as StoreKind) ?? "other";

  const { data: storeRows } = await supabase
    .from("store_categories")
    .select("match_pattern, store_kind, is_convenience")
    .or(orOwnOrGlobal);
  const store = resolveStore(payload.store_name, fallbackKind, storeRows ?? []);

  // is_sweet per chosen category.
  const catIds = [
    ...new Set(payload.items.map((i) => i.category_id).filter(Boolean)),
  ] as string[];
  const { data: cats } = catIds.length
    ? await supabase.from("categories").select("id, is_sweet").in("id", catIds)
    : { data: [] as { id: string; is_sweet: boolean }[] };
  const sweetById = new Map((cats ?? []).map((c) => [c.id, c.is_sweet]));

  await supabase
    .from("receipts")
    .update({
      store_name: payload.store_name,
      store_name_normalized: payload.store_name
        ? normalizeText(payload.store_name)
        : null,
      store_kind: store.store_kind,
      is_convenience: store.is_convenience,
      purchased_at: payload.purchased_at,
      total_amount: payload.total_amount,
      status: "confirmed",
    })
    .eq("id", payload.receiptId)
    .eq("user_id", user.id);

  // Replace items.
  await supabase
    .from("receipt_items")
    .delete()
    .eq("receipt_id", payload.receiptId)
    .eq("user_id", user.id);

  const rows = payload.items
    .filter((i) => i.name.trim() !== "")
    .map((i) => ({
      receipt_id: payload.receiptId,
      user_id: user.id,
      name: i.name,
      name_normalized: normalizeText(i.name),
      amount: Math.round(i.amount) || 0,
      category_id: i.category_id,
      is_sweet: i.category_id ? !!sweetById.get(i.category_id) : false,
      source: "user",
    }));

  if (rows.length) {
    await supabase.from("receipt_items").insert(rows);
  }

  // Write learned mappings (per-user): last choice per normalized name wins.
  const learned = rows.filter((r) => r.category_id);
  if (learned.length) {
    const byName = new Map<string, string>();
    for (const r of learned) byName.set(r.name_normalized, r.category_id!);
    const names = [...byName.keys()];

    await supabase
      .from("item_category_map")
      .delete()
      .eq("user_id", user.id)
      .in("name_normalized", names);
    await supabase.from("item_category_map").insert(
      [...byName].map(([name_normalized, category_id]) => ({
        user_id: user.id,
        name_normalized,
        category_id,
      })),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  revalidatePath(`/receipts/${payload.receiptId}`);
}
