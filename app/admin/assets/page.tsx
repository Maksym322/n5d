import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Constants } from "@/lib/types/database";
import {
  ADMIN_PAGE_SIZE,
  hasActiveAssetFilters,
  listAdminAssets,
  parseAdminAssetFilters,
} from "@/lib/db/admin";
import { buttonClasses } from "@/components/ui/button";
import { RegistryTabs } from "@/components/admin/registry-tabs";
import { RegistrySearch, RegistrySelect } from "@/components/admin/registry-filters";
import { AssetRow } from "@/components/admin/registry-table";
import { Pagination } from "@/components/marketplace/pagination";
import { EmptyState } from "@/components/marketplace/empty-state";

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminAssetFilters(await searchParams);
  const { items, total } = await listAdminAssets(filters);
  const t = await getTranslations("admin");
  const tm = await getTranslations("marketplace");

  const statusOptions = Constants.public.Enums.asset_status.map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));
  const categoryOptions = Constants.public.Enums.asset_category.map((c) => ({
    value: c,
    label: tm(`enums.category.${c}`),
  }));

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </header>
      <RegistryTabs />

      <div className="flex flex-wrap items-center gap-3">
        <RegistrySearch tab="assets" />
        <RegistrySelect
          param="status"
          label={t("filters.status")}
          anyLabel={t("filters.any")}
          options={statusOptions}
        />
        <RegistrySelect
          param="category"
          label={t("filters.category")}
          anyLabel={t("filters.any")}
          options={categoryOptions}
        />
      </div>

      <p className="text-sm text-muted">{t("results", { count: total })}</p>

      {items.length === 0 ? (
        <EmptyState
          title={t("empty.assets")}
          description={hasActiveAssetFilters(filters) ? t("empty.widen") : undefined}
          action={
            hasActiveAssetFilters(filters) ? (
              <Link href="/admin/assets" className={buttonClasses({ variant: "outline", size: "sm" })}>
                {t("filters.clear")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <Pagination total={total} page={filters.page} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
