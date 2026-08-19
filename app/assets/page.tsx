import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/db/session";
import {
  ASSET_PAGE_SIZE,
  getCategoryFacets,
  hasActiveFilters,
  listAssets,
  parseAssetFilters,
  widenSuggestionKey,
} from "@/lib/db/assets";
import { isNlSearchEnabled } from "@/lib/ai/gemini";
import { buttonClasses } from "@/components/ui/button";
import { SearchInput } from "@/components/marketplace/search-input";
import { CategoryPills } from "@/components/marketplace/category-pills";
import { ActiveFilterChips } from "@/components/marketplace/active-filter-chips";
import { FiltersPanel } from "@/components/marketplace/filters-panel";
import { SortSelect } from "@/components/marketplace/sort-select";
import { ListingRow } from "@/components/marketplace/listing-row";
import { Pagination } from "@/components/marketplace/pagination";
import { EmptyState } from "@/components/marketplace/empty-state";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const isBuyer = user.app_metadata?.role === "BUYER";
  const filters = parseAssetFilters(await searchParams);

  const [{ items, total }, facets] = await Promise.all([
    listAssets(filters),
    getCategoryFacets(filters),
  ]);
  const t = await getTranslations("marketplace");

  return (
    <main className="mx-auto max-w-[1240px] space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("catalogue.title")}</h1>
        <p className="text-sm text-muted">{t("catalogue.subtitle")}</p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput aiEnabled={isNlSearchEnabled()} />
          <FiltersPanel />
          <SortSelect />
        </div>
        <CategoryPills facets={facets} />
        <ActiveFilterChips />
      </div>

      <p className="text-sm text-muted">{t("catalogue.results", { count: total })}</p>

      {items.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          description={t(`empty.${widenSuggestionKey(filters)}`)}
          action={
            hasActiveFilters(filters) ? (
              <Link
                href="/assets"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                {t("empty.clear")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((asset) => (
            <ListingRow key={asset.id} asset={asset} showContact={isBuyer} />
          ))}
        </div>
      )}

      <Pagination total={total} page={filters.page} pageSize={ASSET_PAGE_SIZE} />
    </main>
  );
}
