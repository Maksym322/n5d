import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/db/session";
import { getMyBuyerProfile } from "@/lib/db/buyer";
import { getMySellerProfile } from "@/lib/db/seller";
import { MandateForm } from "@/components/marketplace/mandate-form";
import { SellerProfileForm } from "@/components/marketplace/seller-profile-form";

// Role-aware profile editor: sellers edit their public/private trading profile, buyers edit their
// investment mandate. One nav path for both (site-header links /profile for every role).
export default async function ProfilePage() {
  const user = await requireUser();
  const role = user.app_metadata?.role;

  if (role === "SELLER") {
    const initial = await getMySellerProfile();
    const t = await getTranslations("seller");
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>
          <p className="text-sm text-muted">{t("profile.subtitle")}</p>
        </header>
        <SellerProfileForm initial={initial} />
      </main>
    );
  }

  const mandate = await getMyBuyerProfile();
  const t = await getTranslations("profile");
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </header>
      <MandateForm initial={mandate} />
    </main>
  );
}
