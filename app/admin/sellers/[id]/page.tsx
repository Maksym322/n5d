import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getAdminSeller,
  listModerationLog,
  listSellerAssets,
} from "@/lib/db/admin";
import { AccountStatusBadge } from "@/components/admin/status-badge";
import { SellerConsequence } from "@/components/admin/consequence-panel";
import { ModerationForm } from "@/components/admin/moderation-form";
import { AssetRow } from "@/components/admin/registry-table";
import { LogTable } from "@/components/admin/log-table";
import { InfoCard } from "@/components/admin/info-card";

export default async function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seller = await getAdminSeller(id);
  if (!seller) notFound();

  const [assets, history] = await Promise.all([
    listSellerAssets(id),
    listModerationLog({ action: null, targetType: null, page: 1, targetId: id }),
  ]);
  const t = await getTranslations("admin");
  const action = seller.status === "ACTIVE" ? "SUSPEND" : "REACTIVATE";

  return (
    <>
      <Link href="/admin/sellers" className="text-sm text-muted transition hover:text-foreground">
        ← {t("detail.backSellers")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {seller.companyName ?? seller.displayName}
          </h1>
          <p className="text-sm text-muted">
            {seller.displayName}
            {seller.headline ? ` · ${seller.headline}` : ""}
          </p>
        </div>
        <AccountStatusBadge status={seller.status} />
      </header>

      <section className="space-y-3">
        <SellerConsequence status={seller.status} publishedCount={seller.publishedAssetCount} />
        <ModerationForm
          kind="participant"
          targetId={seller.userId}
          action={action}
          publishedCount={seller.publishedAssetCount}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          title={t("detail.identity")}
          rows={[
            [t("detail.company"), seller.companyName],
            [t("detail.contact"), seller.contactName],
            [t("detail.website"), seller.website],
            [t("detail.registration"), seller.registrationNumber],
          ]}
        />
        <InfoCard
          title={t("detail.tradingProfile")}
          rows={[
            [t("detail.jurisdiction"), seller.jurisdiction],
            [t("detail.verified"), seller.verified ? t("detail.verified") : t("detail.unverified")],
          ]}
          extra={seller.description}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t("detail.listings")}</h2>
        {assets.length ? (
          <div className="space-y-2">
            {assets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("detail.none")}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t("detail.history")}</h2>
        {history.items.length ? (
          <LogTable entries={history.items} />
        ) : (
          <p className="text-sm text-muted">{t("empty.history")}</p>
        )}
      </section>
    </>
  );
}
