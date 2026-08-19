import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isSuspended, requireUser } from "@/lib/db/session";
import { getMyAssetByRef } from "@/lib/db/seller-assets";
import { formatAssetRef } from "@/lib/format";
import { AssetForm } from "@/components/marketplace/asset-form";
import { ReadOnlyNotice } from "@/components/marketplace/read-only-notice";
import { ChevronRightIcon } from "@/components/ui/icons";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  await requireUser();
  const { ref } = await params;
  const refNum = Number(ref);
  // RLS returns only the seller's own rows (any status); a ref that isn't theirs → notFound.
  const asset = Number.isInteger(refNum) ? await getMyAssetByRef(refNum) : null;
  if (!asset) notFound();

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
        <h1 className="text-2xl font-bold text-foreground">
          {t("assetForm.editTitle", { ref: formatAssetRef(asset.publicRef) })}
        </h1>
        <p className="text-sm text-muted">{t("assetForm.editSubtitle")}</p>
      </header>
      {suspended ? <ReadOnlyNotice /> : <AssetForm initial={asset} currentYear={currentYear} />}
    </main>
  );
}
