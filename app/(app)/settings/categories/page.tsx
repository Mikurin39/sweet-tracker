import { createClient } from "@/lib/supabase/server";
import {
  CategoryManager,
  type ManagedCategory,
} from "@/components/settings/category-manager";

export default async function CategoriesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, is_sweet, user_id, sort")
    .order("sort");

  const managed: ManagedCategory[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    is_sweet: c.is_sweet,
    editable: c.user_id != null && c.user_id === user?.id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">カテゴリ</h1>
        <p className="text-muted-foreground text-sm">
          標準カテゴリに加えて、独自のカテゴリを追加できます。
        </p>
      </div>
      <CategoryManager categories={managed} />
    </div>
  );
}
