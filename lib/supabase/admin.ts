import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Secret-key client that bypasses RLS. Per ADR-2 the secret key appears in exactly two
// places: the seed scripts and actions/moderation.ts. The seed builds its own client
// (it runs outside Next, where "server-only" would throw); this helper is the sanctioned
// seam for moderation Server Actions in a later phase.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin env missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
