"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const localeSchema = z.object({
  locale: z.enum(["en", "uk"]),
});

// Locale lives in a cookie (ADR-8) and is mirrored into profiles.locale when signed in.
export async function setLocale(formData: FormData): Promise<void> {
  const { locale } = localeSchema.parse({ locale: formData.get("locale") });

  const store = await cookies();
  store.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Best-effort mirror; RLS restricts this to the user's own row.
    await supabase.from("profiles").update({ locale }).eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
