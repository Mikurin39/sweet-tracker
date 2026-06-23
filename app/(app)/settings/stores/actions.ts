"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeText } from "@/lib/categorize/normalize";

const KINDS = [
  "convenience",
  "supermarket",
  "drugstore",
  "restaurant",
  "other",
] as const;

export async function addStore(input: { pattern: string; kind: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const pattern = normalizeText(input.pattern);
  if (!pattern) throw new Error("店舗名を入力してください");

  const kind = (KINDS as readonly string[]).includes(input.kind)
    ? input.kind
    : "other";

  const { error } = await supabase.from("store_categories").insert({
    user_id: user.id,
    match_pattern: pattern,
    store_kind: kind,
    is_convenience: kind === "convenience",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/stores");
}

export async function deleteStore(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("store_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/stores");
}
