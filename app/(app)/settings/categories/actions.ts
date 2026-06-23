"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addCategory(input: { name: string; isSweet: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("名前を入力してください");

  const slug = `custom-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    slug,
    name,
    is_sweet: input.isSweet,
    sort: 90,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/categories");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/categories");
}
