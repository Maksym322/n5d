"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ACCOUNTS, SEEDED_ACCOUNTS } from "@/lib/demo-accounts";

// Every mutation is a Server Action with zod parsed at the boundary (ADR-12).
const roleSchema = z.object({
  role: z.enum(["BUYER", "SELLER", "MANAGER"]),
});

const emailSchema = z.object({ email: z.string().email() });

// Passwordless demo sign-in. The role is bound per button via signInAs.bind(null, role)
// rather than passed through form fields — React overrides a button's `name` when its
// formAction is a function, so a hidden field would arrive empty.
export async function signInAs(rawRole: string): Promise<void> {
  const { role } = roleSchema.parse({ role: rawRole });

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password) {
    throw new Error("DEMO_ACCOUNT_PASSWORD is not set in the environment");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role],
    password,
  });
  if (error) {
    throw new Error(`Demo sign-in failed: ${error.message}`);
  }

  redirect("/");
}

// Sign into a specific seeded account (the /login account picker). The email is bound per
// button and validated against SEEDED_ACCOUNTS so only known demo accounts are reachable.
export async function signInAsAccount(rawEmail: string): Promise<void> {
  const { email } = emailSchema.parse({ email: rawEmail });
  if (!SEEDED_ACCOUNTS.some((a) => a.email === email)) {
    throw new Error("Unknown demo account");
  }

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password) {
    throw new Error("DEMO_ACCOUNT_PASSWORD is not set in the environment");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Demo sign-in failed: ${error.message}`);
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
