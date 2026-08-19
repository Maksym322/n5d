import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatMoneyCompact, formatTicketRange } from "@/lib/format";
import type { AdminAssetRow, AdminBuyerRow, AdminSellerRow } from "@/lib/db/admin";
import { AccountStatusBadge, AssetStatusBadge } from "@/components/admin/status-badge";

// Registry rows follow the app's stacked-card list pattern (rounded-card border bg-surface),
// not an HTML <table> — consistent with the marketplace listing rows and the seller dashboard.
// Each row links to its detail page where moderation happens.

const CARD =
  "block rounded-card border border-border bg-surface p-4 transition hover:border-accent";

export function BuyerRow({ buyer }: { buyer: AdminBuyerRow }) {
  const t = useTranslations("admin");
  const tm = useTranslations("marketplace");
  return (
    <Link href={`/admin/buyers/${buyer.userId}`} className={CARD}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {buyer.companyName ?? buyer.displayName}
            </span>
            <span className="text-xs text-muted">{buyer.displayName}</span>
          </div>
          {buyer.headline ? (
            <p className="truncate text-sm text-muted">{buyer.headline}</p>
          ) : null}
          <p className="text-xs text-muted">
            {buyer.investorType ? tm(`enums.investorType.${buyer.investorType}`) : t("detail.none")}
            {" · "}
            {formatTicketRange(buyer.ticketMinCents, buyer.ticketMaxCents)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <AccountStatusBadge status={buyer.status} />
          <span className="text-xs text-muted">
            {buyer.isListed ? t("filters.listedYes") : t("filters.listedNo")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function SellerRow({ seller }: { seller: AdminSellerRow }) {
  const t = useTranslations("admin");
  return (
    <Link href={`/admin/sellers/${seller.userId}`} className={CARD}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {seller.companyName ?? seller.displayName}
            </span>
            <span className="text-xs text-muted">{seller.displayName}</span>
          </div>
          {seller.headline ? (
            <p className="truncate text-sm text-muted">{seller.headline}</p>
          ) : null}
          <p className="text-xs text-muted">
            {seller.jurisdiction ?? t("detail.none")}
            {" · "}
            {t("table.listings")}: {t("table.publishedCount", { count: seller.publishedAssetCount })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <AccountStatusBadge status={seller.status} />
          {seller.verified ? (
            <span className="text-xs text-success">{t("detail.verified")}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function AssetRow({ asset }: { asset: AdminAssetRow }) {
  const t = useTranslations("admin");
  const tm = useTranslations("marketplace");
  return (
    <Link href={`/admin/assets/${asset.publicRef}`} className={CARD}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">#{asset.publicRef}</span>
            <span className="truncate text-sm text-foreground">{asset.title}</span>
          </div>
          <p className="text-xs text-muted">
            {tm(`enums.category.${asset.category}`)}
            {" · "}
            {t("table.seller")}: {asset.sellerCompanyName ?? asset.sellerDisplayName ?? t("table.anonymous")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <AssetStatusBadge status={asset.status} />
          <span className="text-sm font-semibold text-accent">
            {asset.askingPriceCents !== null
              ? formatMoneyCompact(asset.askingPriceCents)
              : t("table.anonymous")}
          </span>
        </div>
      </div>
    </Link>
  );
}
