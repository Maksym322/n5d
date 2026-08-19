import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/db/session";
import {
  BUYER_PAGE_SIZE,
  getBuyerFacets,
  hasActiveBuyerFilters,
  listBuyers,
  parseBuyerFilters,
  widenBuyerSuggestionKey,
} from "@/lib/db/buyer-directory";
import { buttonClasses } from "@/components/ui/button";
import { CategoryPills } from "@/components/marketplace/category-pills";
import { BuyerFiltersPanel } from "@/components/marketplace/buyer-filters-panel";
import { BuyerCard } from "@/components/marketplace/buyer-card";
import { Pagination } from "@/components/marketplace/pagination";
import { EmptyState } from "@/components/marketplace/empty-state";

// The anonymous buyer directory a seller browses (F3). Same URL-param + faceting shape as the asset
// catalogue (ADR-3/16): CategoryPills and Pagination are reused verbatim; the facet counts recompute
// against the active filter set. Cards never carry a company name (D1).
export default async function SellerBuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const filters = parseBuyerFilters(await searchParams);

  const [{ items, total }, facets] = await Promise.all([
    listBuyers(filters),
    getBuyerFacets(filters),
  ]);
  const t = await getTranslations("seller");

  return (
    <main className="mx-auto max-w-[1240px] space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("buyers.title")}</h1>
        <p className="text-sm text-muted">{t("buyers.subtitle")}</p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <BuyerFiltersPanel />
        </div>
        <CategoryPills facets={facets} />
      </div>

      <p className="text-sm text-muted">{t("buyers.results", { count: total })}</p>

      {items.length === 0 ? (
        <EmptyState
          title={t("buyers.empty.title")}
          description={t(`buyers.empty.${widenBuyerSuggestionKey(filters)}`)}
          action={
            hasActiveBuyerFilters(filters) ? (
              <Link
                href="/seller/buyers"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                {t("buyers.empty.clear")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((buyer) => (
            <BuyerCard key={buyer.userId} buyer={buyer} />
          ))}
        </div>
      )}

      <Pagination total={total} page={filters.page} pageSize={BUYER_PAGE_SIZE} />
    </main>
  );
}
