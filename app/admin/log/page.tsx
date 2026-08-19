import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Constants } from "@/lib/types/database";
import {
  ADMIN_PAGE_SIZE,
  hasActiveModLogFilters,
  listModerationLog,
  parseModLogFilters,
} from "@/lib/db/admin";
import { buttonClasses } from "@/components/ui/button";
import { RegistrySelect } from "@/components/admin/registry-filters";
import { LogTable } from "@/components/admin/log-table";
import { Pagination } from "@/components/marketplace/pagination";
import { EmptyState } from "@/components/marketplace/empty-state";

export default async function AdminLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseModLogFilters(await searchParams);
  const { items, total } = await listModerationLog(filters);
  const t = await getTranslations("admin");

  const actionOptions = Constants.public.Enums.moderation_action.map((a) => ({
    value: a,
    label: t(`actions.${a}`),
  }));
  const targetOptions = [
    { value: "USER", label: t("filters.targetUser") },
    { value: "ASSET", label: t("filters.targetAsset") },
  ];

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("log.title")}</h1>
        <p className="text-sm text-muted">{t("log.subtitle")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <RegistrySelect
          param="action"
          label={t("filters.action")}
          anyLabel={t("filters.any")}
          options={actionOptions}
        />
        <RegistrySelect
          param="target"
          label={t("filters.target")}
          anyLabel={t("filters.any")}
          options={targetOptions}
        />
      </div>

      <p className="text-sm text-muted">{t("log.results", { count: total })}</p>

      {items.length === 0 ? (
        <EmptyState
          title={t("empty.log")}
          description={hasActiveModLogFilters(filters) ? t("empty.widen") : undefined}
          action={
            hasActiveModLogFilters(filters) ? (
              <Link href="/admin/log" className={buttonClasses({ variant: "outline", size: "sm" })}>
                {t("filters.clear")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <LogTable entries={items} />
      )}

      <Pagination total={total} page={filters.page} pageSize={ADMIN_PAGE_SIZE} />
    </>
  );
}
