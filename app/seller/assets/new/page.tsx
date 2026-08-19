import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isSuspended, requireUser } from "@/lib/db/session";
import { AssetForm } from "@/components/marketplace/asset-form";
import { ReadOnlyNotice } from "@/components/marketplace/read-only-notice";
import { ChevronRightIcon } from "@/components/ui/icons";

export default async function NewAssetPage() {
  await requireUser();
  const suspended = await isSuspended();
  const t = await getTranslations("seller");
  const currentYear = new Date().getFullYear();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Link
        href="/seller"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        {t("assetForm.back")}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("assetForm.newTitle")}</h1>
        <p className="text-sm text-muted">{t("assetForm.newSubtitle")}</p>
      </header>
      {suspended ? <ReadOnlyNotice /> : <AssetForm initial={null} currentYear={currentYear} />}
    </main>
  );
}
