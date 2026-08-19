import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isSuspended, requireUser } from "@/lib/db/session";
import { listMyAssets, type AssetStatus } from "@/lib/db/seller-assets";
import { listIncomingPendingRequests } from "@/lib/db/conversations";
import { buttonClasses } from "@/components/ui/button";
import { AssetStatusGroup } from "@/components/marketplace/asset-status-group";
import { IncomingRequestCard } from "@/components/marketplace/incoming-request-card";
import { EmptyState } from "@/components/marketplace/empty-state";
import { ReadOnlyNotice } from "@/components/marketplace/read-only-notice";

// Seller dashboard (F2): my assets grouped by status, incoming requests needing a response, and
// quick counts. Groups are shown in the order a seller cares about most.
const GROUP_ORDER: AssetStatus[] = ["PUBLISHED", "DRAFT", "SUSPENDED", "SOLD"];

export default async function SellerDashboardPage() {
  await requireUser();
  const [assets, incoming, suspended] = await Promise.all([
    listMyAssets(),
    listIncomingPendingRequests(),
    isSuspended(),
  ]);
  const t = await getTranslations("seller");

  const byStatus = (status: AssetStatus) => assets.filter((a) => a.status === status);
  const publishedCount = byStatus("PUBLISHED").length;
  const draftCount = byStatus("DRAFT").length;

  const stats = [
    { label: t("dashboard.stats.total"), value: assets.length },
    { label: t("dashboard.stats.published"), value: publishedCount },
    { label: t("dashboard.stats.drafts"), value: draftCount },
    { label: t("dashboard.stats.incoming"), value: incoming.length },
  ];

  return (
    <main className="mx-auto max-w-[1240px] space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted">{t("dashboard.subtitle")}</p>
        </div>
        {suspended ? null : (
          <Link href="/seller/assets/new" className={buttonClasses({ size: "sm" })}>
            {t("dashboard.newAsset")}
          </Link>
        )}
      </header>

      {suspended ? <ReadOnlyNotice /> : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-surface p-4">
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs uppercase tracking-wide text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("dashboard.incomingTitle")}
        </h2>
        {incoming.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted">
            {t("dashboard.incomingEmpty")}
          </p>
        ) : (
          <div className="space-y-3">
            {incoming.map((request) => (
              <IncomingRequestCard key={request.id} request={request} suspended={suspended} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          {t("dashboard.assetsTitle")}
        </h2>
        {assets.length === 0 ? (
          <EmptyState
            title={t("dashboard.noAssetsTitle")}
            description={t("dashboard.noAssetsBody")}
            action={
              suspended ? undefined : (
                <Link
                  href="/seller/assets/new"
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  {t("dashboard.newAsset")}
                </Link>
              )
            }
          />
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.map((status) => (
              <AssetStatusGroup
                key={status}
                status={status}
                assets={byStatus(status)}
                suspended={suspended}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
