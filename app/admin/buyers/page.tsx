import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Constants } from "@/lib/types/database";
import {
  ADMIN_PAGE_SIZE,
  hasActiveBuyerFilters,
  listAdminBuyers,
  parseAdminBuyerFilters,
} from "@/lib/db/admin";
import { buttonClasses } from "@/components/ui/button";
import { RegistryTabs } from "@/components/admin/registry-tabs";
import { RegistrySearch, RegistrySelect } from "@/components/admin/registry-filters";
import { BuyerRow } from "@/components/admin/registry-table";
import { Pagination } from "@/components/marketplace/pagination";
import { EmptyState } from "@/components/marketplace/empty-state";

export default async function AdminBuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminBuyerFilters(await searchParams);
  const { items, total } = await listAdminBuyers(filters);
  const t = await getTranslations("admin");

  const statusOptions = Constants.public.Enums.account_status.map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));
  const listedOptions = [
    { value: "true", label: t("filters.listedYes") },
    { value: "false", label: t("filters.listedNo") },
  ];

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </header>
      <RegistryTabs />

      <div className="flex flex-wrap items-center gap-3">
        <RegistrySearch tab="buyers" />
        <RegistrySelect
          param="status"
          label={t("filters.status")}
          anyLabel={t("filters.any")}
          options={statusOptions}
        />
        <RegistrySelect
          param="listed"
          label={t("filters.listed")}
          anyLabel={t("filters.any")}
          options={listedOptions}
        />
      </div>

      <p className="text-sm text-muted">{t("results", { count: total })}</p>

      {items.length === 0 ? (
        <EmptyState
          title={t("empty.buyers")}
          description={hasActiveBuyerFilters(filters) ? t("empty.widen") : undefined}
          action={
            hasActiveBuyerFilters(filters) ? (
              <Link href="/admin/buyers" className={buttonClasses({ variant: "outline", size: "sm" })}>
                {t("filters.clear")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((buyer) => (
            <BuyerRow key={buyer.userId} buyer={buyer} />
          ))}
        </div>
      )}

      <Pagination total={total} page={filters.page} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
