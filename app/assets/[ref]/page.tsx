import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/db/session";
import { getAssetByRef } from "@/lib/db/assets";
import { CONTACT_QUOTA, getMyPendingContactCount } from "@/lib/db/conversations";
import { formatAssetRef, formatMoney } from "@/lib/format";
import { jurisdictionName } from "@/lib/jurisdictions";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CountryChip } from "@/components/marketplace/country-chip";
import { AttributeGrid, type Attribute } from "@/components/marketplace/attribute-grid";
import { HighlightPills } from "@/components/marketplace/highlight-pills";
import { MarketTrendChart } from "@/components/marketplace/market-trend-chart";
import { ValidatedBadge } from "@/components/marketplace/validated-badge";
import { ContactPanel } from "@/components/marketplace/contact-panel";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const user = await requireUser();
  const { ref } = await params;
  const refNum = Number(ref);
  const asset = Number.isInteger(refNum) ? await getAssetByRef(refNum) : null;
  if (!asset) notFound();

  const isBuyer = user.app_metadata?.role === "BUYER";
  const pendingCount = isBuyer ? await getMyPendingContactCount() : 0;
  const t = await getTranslations("marketplace");
  const locale = await getLocale();

  const money = (cents: number | null) =>
    cents === null ? t("listing.na") : formatMoney(cents, "EUR", locale);
  const num = (n: number | null) => (n === null ? t("listing.na") : String(n));

  const attributes: Attribute[] = [
    {
      label: t("listing.country"),
      value: `${jurisdictionName(asset.jurisdiction)} (${asset.jurisdiction})`,
    },
    { label: t("listing.category"), value: t(`enums.category.${asset.category}`) },
    { label: t("listing.dealType"), value: t(`enums.dealType.${asset.dealType}`) },
    { label: t("listing.revenue"), value: money(asset.revenueCents) },
    { label: t("listing.ebitda"), value: money(asset.ebitdaCents) },
    { label: t("listing.employees"), value: num(asset.employees) },
    { label: t("listing.yearFounded"), value: num(asset.yearFounded) },
  ];

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-8">
      <Link
        href="/assets"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        {t("detail.back")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <header className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-border bg-surface p-5">
            <div className="flex items-center gap-4">
              <CountryChip code={asset.jurisdiction} />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {t("listing.ref", { ref: formatAssetRef(asset.publicRef) })}
                </h1>
                {asset.validated ? <ValidatedBadge /> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-muted">
                {t("listing.askingPrice")}
              </div>
              <div className="text-3xl font-bold text-accent">
                {money(asset.askingPriceCents)}
              </div>
            </div>
          </header>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              {t("detail.keyFacts")}
            </h2>
            <AttributeGrid items={attributes} />
          </section>

          <section className="space-y-2 rounded-card border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">
              {t("detail.about")}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-muted">{asset.description}</p>
          </section>

          {asset.highlights.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                {t("detail.highlights")}
              </h2>
              <HighlightPills items={asset.highlights} max={asset.highlights.length} />
            </section>
          ) : null}

          {asset.seller ? (
            <section className="space-y-2 rounded-card border border-border bg-surface p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {t("detail.sellerProfile")}
                </h2>
                {asset.seller.verified ? <ValidatedBadge /> : null}
              </div>
              <p className="text-sm font-medium text-foreground">
                {asset.seller.headline}
              </p>
              {asset.seller.description ? (
                <p className="text-sm text-muted">{asset.seller.description}</p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-card border border-border bg-surface p-5">
            <MarketTrendChart points={asset.priceHistory} />
          </div>
          {isBuyer ? (
            <ContactPanel
              sellerId={asset.sellerId}
              assetId={asset.id}
              pendingCount={pendingCount}
              quota={CONTACT_QUOTA}
            />
          ) : (
            <p className="rounded-card border border-border bg-surface p-5 text-sm text-muted">
              {t("contact.buyersOnly")}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
