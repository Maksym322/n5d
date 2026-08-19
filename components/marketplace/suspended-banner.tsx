import { getTranslations } from "next-intl/server";
import type { Tables } from "@/lib/types/database";
import { getMyProfile } from "@/lib/db/session";

// F5: a suspended account keeps read access but every write is blocked by is_active() in
// RLS. The banner makes that state visible; the enforcement lives in the database, not here.
// It renders in the root layout, so a transient read failure must fail safe (render nothing)
// rather than take down every page.
export async function SuspendedBanner() {
  let profile: Tables<"profiles"> | null = null;
  try {
    profile = await getMyProfile();
  } catch {
    return null;
  }
  if (!profile || profile.status !== "SUSPENDED") return null;

  const t = await getTranslations("common");
  return (
    <div className="border-b border-danger/30 bg-danger/10 px-6 py-2 text-center text-sm font-medium text-danger">
      {t("suspended")}
    </div>
  );
}
