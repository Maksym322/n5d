import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { Tables } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";

// Session + own-profile helpers. Every lib/db function opens its own RLS-bound client
// (ADR-5); these replace the inline supabase.auth.getUser() calls in server components.

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// For pages/actions that require a signed-in user. Redirects to /login otherwise.
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// Own profile row (RLS profiles_read_self). `status` drives the F5 suspended banner.
export async function getMyProfile(): Promise<Tables<"profiles"> | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
