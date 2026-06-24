// TEMPORARY diagnostic route. Reports env-var presence (not secret values).
// Remove after debugging deployment env vars.
export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return Response.json({
    NEXT_PUBLIC_SUPABASE_URL_value: url || null, // public info
    NEXT_PUBLIC_SUPABASE_URL_length: url.length,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_present:
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_length: (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    ).length,
    SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY_present: !!process.env.GEMINI_API_KEY,
  });
}
