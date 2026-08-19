import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/format";
import { getAdminAssetByRef, listModerationLog } from "@/lib/db/admin";
import { AssetStatusBadge } from "@/components/admin/status-badge";
import { AssetConsequence } from "@/components/admin/consequence-panel";
import { ModerationForm } from "@/components/admin/moderation-form";
import { LogTable } from "@/components/admin/log-table";
import { InfoCard } from "@/components/admin/info-card";

export default async function AdminAssetDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const publicRef = Number(ref);
  if (!Number.isInteger(publicRef)) notFound();

  const asset = await getAdminAssetByRef(publicRef);
  if (!asset) notFound();

  const history = await listModerationLog({
    action: null,
    targetType: null,
    page: 1,
    targetId: asset.id,
  });
  const t = await getTranslations("admin");
  const tm = await getTranslations("marketplace");

  // SUSPEND_ASSET applies only to a PUBLISHED listing, REPUBLISH_ASSET only to a SUSPENDED one.
  // A DRAFT or SOLD asset has no manager action on this path (that is the seller's flow).
  const action =
    asset.status === "PUBLISHED"
      ? "SUSPEND_ASSET"
      : asset.status === "SUSPENDED"
        ? "REPUBLISH_ASSET"
        : null;

  const sellerName = asset.sellerCompanyName ?? asset.sellerDisplayName ?? t("table.anonymous");

  return (
    <>
      <Link href="/admin/assets" className="text-sm text-muted transition hover:text-foreground">
        ← {t("detail.backAssets")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            #{asset.publicRef} · {asset.title}
          </h1>
          <p className="text-sm text-muted">
            {tm(`enums.category.${asset.category}`)} · {asset.jurisdiction} ·{" "}
            {tm(`enums.dealType.${asset.dealType}`)}
          </p>
        </div>
        <AssetStatusBadge status={asset.status} />
      </header>

      <section className="space-y-3">
        <AssetConsequence status={asset.status} />
        {action ? (
          <ModerationForm kind="asset" targetId={asset.id} action={action} />
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          title={t("detail.identity")}
          rows={[
            [t("detail.company"), asset.sellerCompanyName],
            [
              t("table.seller"),
              asset.sellerDisplayName,
            ],
          ]}
          extra={
            <Link
              href={`/admin/sellers/${asset.sellerId}`}
              className="text-accent transition hover:underline"
            >
              {t("detail.viewSeller")} — {sellerName}
            </Link>
          }
        />
        <InfoCard
          title={t("detail.tradingProfile")}
          rows={[
            [
              t("table.price"),
              asset.askingPriceCents !== null ? formatMoney(asset.askingPriceCents) : null,
            ],
            [tm("listing.revenue"), asset.revenueCents !== null ? formatMoney(asset.revenueCents) : null],
            [tm("listing.ebitda"), asset.ebitdaCents !== null ? formatMoney(asset.ebitdaCents) : null],
            [tm("listing.employees"), asset.employees !== null ? String(asset.employees) : null],
            [tm("listing.yearFounded"), asset.yearFounded !== null ? String(asset.yearFounded) : null],
          ]}
          extra={asset.description}
        />
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
