import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER ONLY — bypasses RLS.
 * Use only in trusted server code (e.g. the receipt-processing route).
 * Never import this into a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
