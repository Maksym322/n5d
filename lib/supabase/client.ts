import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

// Browser Supabase client (publishable key). Only for Client Components that need
// interactivity; ordinary data access still goes through lib/db/* on the server (ADR-5).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient<Database>(url, key);
}
