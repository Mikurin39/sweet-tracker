import { createClient } from "@/lib/supabase/server";
import {
  StoreManager,
  type ManagedStore,
} from "@/components/settings/store-manager";

export default async function StoresSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: stores } = await supabase
    .from("store_categories")
    .select("id, match_pattern, store_kind, is_convenience, user_id")
    .order("store_kind");

  const managed: ManagedStore[] = (stores ?? []).map((s) => ({
    id: s.id,
    match_pattern: s.match_pattern,
    store_kind: s.store_kind,
    is_convenience: s.is_convenience,
    editable: s.user_id != null && s.user_id === user?.id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">店舗</h1>
        <p className="text-muted-foreground text-sm">
          店舗名と種別の対応付けです。コンビニ判定に使われます。独自の店舗を追加できます。
        </p>
      </div>
      <StoreManager stores={managed} />
    </div>
  );
}
