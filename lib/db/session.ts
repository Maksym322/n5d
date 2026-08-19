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

// For the Platform Manager area. Role lives in the JWT app_metadata (ADR-9 — immutable, so
// no table read); a non-manager is bounced to the catalogue, a signed-out user to /login.
// The service-role moderation actions repeat this assertion in code (ADR-2), since they
// bypass RLS and cannot rely on is_manager() in a policy.
export async function requireManager(): Promise<User> {
  const user = await requireUser();
  if (user.app_metadata?.role !== "MANAGER") redirect("/");
  return user;
}

// F5 helper: is the signed-in user suspended? Write surfaces use this to hide/disable controls
// that the is_active() write policies would reject anyway — so the UI never offers a failing
// action. The database remains the real guard; this is only about not dangling dead buttons.
export async function isSuspended(): Promise<boolean> {
  const profile = await getMyProfile();
  return profile?.status === "SUSPENDED";
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
