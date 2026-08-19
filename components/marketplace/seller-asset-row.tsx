import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { MyAsset } from "@/lib/db/seller-assets";
import { formatAssetRef, formatMoney, formatMonthYear } from "@/lib/format";
import { jurisdictionName } from "@/lib/jurisdictions";
import { buttonClasses } from "@/components/ui/button";
import { AssetStatusButtons } from "@/components/marketplace/asset-status-buttons";

// Compact dashboard row for one of the seller's own assets (F2). Shows the human ref, title, key
// facts and the asking price, plus edit + status affordances.
export function SellerAssetRow({
  asset,
  suspended = false,
}: {
  asset: MyAsset;
  suspended?: boolean;
}) {
  const t = useTranslations("seller");
  const tm = useTranslations("marketplace");
  const locale = useLocale();

  const price =
    asset.askingPriceCents === null
      ? tm("listing.na")
      : formatMoney(asset.askingPriceCents, "EUR", locale);

  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-foreground">
            {tm("listing.ref", { ref: formatAssetRef(asset.publicRef) })}
          </span>
          <span className="truncate text-sm text-muted">{asset.title}</span>
        </div>
        <p className="text-xs text-muted">
          {tm(`enums.category.${asset.category}`)} ·{" "}
          {jurisdictionName(asset.jurisdiction, locale)} · {tm(`enums.dealType.${asset.dealType}`)}
          {asset.publishedAt
            ? ` · ${t("dashboard.listedOn", { date: formatMonthYear(asset.publishedAt, locale) })}`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-accent">{price}</span>
        <Link
          href={`/seller/assets/${asset.publicRef}/edit`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          {t("dashboard.edit")}
        </Link>
        <AssetStatusButtons assetId={asset.id} status={asset.status} suspended={suspended} />
      </div>
    </article>
  );
}
