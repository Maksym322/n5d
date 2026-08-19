import { useTranslations } from "next-intl";
import type { AssetStatus, MyAsset } from "@/lib/db/seller-assets";
import { Badge } from "@/components/ui/badge";
import { SellerAssetRow } from "@/components/marketplace/seller-asset-row";

const TONE: Record<AssetStatus, "neutral" | "success" | "danger" | "accent"> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  SUSPENDED: "danger",
  SOLD: "accent",
};

// One status bucket on the seller dashboard (draft / published / suspended / sold). Rendered only
// when it holds assets; the page handles the all-empty case with a single empty state.
export function AssetStatusGroup({
  status,
  assets,
  suspended = false,
}: {
  status: AssetStatus;
  assets: MyAsset[];
  suspended?: boolean;
}) {
  const t = useTranslations("seller");
  if (assets.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge tone={TONE[status]}>{t(`status.${status}`)}</Badge>
        <span className="text-sm text-muted">
          {t("dashboard.groupCount", { count: assets.length })}
        </span>
      </div>
      <div className="space-y-2">
        {assets.map((asset) => (
          <SellerAssetRow key={asset.id} asset={asset} suspended={suspended} />
        ))}
      </div>
    </section>
  );
}
