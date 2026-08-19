import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { AssetListItem } from "@/lib/db/assets";
import { formatAssetRef, formatMoney, formatMonthYear } from "@/lib/format";
import { jurisdictionName } from "@/lib/jurisdictions";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, EyeIcon } from "@/components/ui/icons";
import { AttributeGrid, type Attribute } from "@/components/marketplace/attribute-grid";
import { CountryChip } from "@/components/marketplace/country-chip";
import { HighlightPills } from "@/components/marketplace/highlight-pills";
import { MarketTrendChart } from "@/components/marketplace/market-trend-chart";
import { ValidatedBadge } from "@/components/marketplace/validated-badge";

// Full-width horizontal listing row (design-audit §A–B, ADR-15). Never shows the seller —
// the row presents the asset, not the vendor (D1). `showContact` gates the contact affordance
// to buyers; sellers and managers see the listing without it.
export function ListingRow({
  asset,
  showContact,
}: {
  asset: AssetListItem;
  showContact: boolean;
}) {
  const t = useTranslations("marketplace");
  const locale = useLocale();

  const money = (cents: number | null) =>
    cents === null ? t("listing.na") : formatMoney(cents, "EUR", locale);
  const num = (n: number | null) => (n === null ? t("listing.na") : String(n));

  const attributes: Attribute[] = [
    {
      label: t("listing.country"),
      value: `${jurisdictionName(asset.jurisdiction, locale)} (${asset.jurisdiction})`,
    },
    { label: t("listing.category"), value: t(`enums.category.${asset.category}`) },
    { label: t("listing.dealType"), value: t(`enums.dealType.${asset.dealType}`) },
    { label: t("listing.revenue"), value: money(asset.revenueCents) },
    { label: t("listing.ebitda"), value: money(asset.ebitdaCents) },
    { label: t("listing.employees"), value: num(asset.employees) },
    { label: t("listing.yearFounded"), value: num(asset.yearFounded) },
  ];

  return (
    <article className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: flag thumbnail + listing date */}
        <div className="flex flex-row items-center gap-3 lg:w-[140px] lg:flex-col lg:items-start">
          <CountryChip code={asset.jurisdiction} />
          {asset.publishedAt ? (
            <span className="text-xs font-semibold text-muted">
              {t("listing.date", {
                date: formatMonthYear(asset.publishedAt, locale),
              })}
            </span>
          ) : null}
        </div>

        {/* Middle: title, price, attributes, highlights, actions */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">
                {t("listing.ref", { ref: formatAssetRef(asset.publicRef) })}
              </h3>
              {asset.validated ? <ValidatedBadge /> : null}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] uppercase tracking-wide text-muted">
                {t("listing.askingPrice")}
              </div>
              <div className="text-2xl font-bold text-accent">
                {money(asset.askingPriceCents)}
              </div>
            </div>
          </div>

          <AttributeGrid items={attributes} />

          {asset.highlights.length > 0 ? (
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">
                {t("listing.highlights")}
              </span>
              <HighlightPills items={asset.highlights} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted">
              {t("listing.views", { count: asset.viewCount })}
            </span>
            <div className="flex gap-2">
              <Link
                href={`/assets/${asset.publicRef}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <EyeIcon className="h-4 w-4" />
                {t("listing.viewAsset")}
              </Link>
              {showContact ? (
                <Link
                  href={`/assets/${asset.publicRef}#contact`}
                  className={buttonClasses({ variant: "solid", size: "sm" })}
                >
                  {t("listing.contactSeller")}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: market trend chart */}
        <div className="lg:w-[250px] lg:shrink-0">
          <MarketTrendChart points={asset.priceHistory} />
        </div>
      </div>
    </article>
  );
}
