"use client";

import { useTranslations } from "next-intl";
import { Constants } from "@/lib/types/database";
import type { AssetCategory, CategoryFacets } from "@/lib/db/assets";
import { cn } from "@/lib/cn";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

// Category facets as pill buttons carrying counts (design-audit §E, ADR-16). Counts come
// from the server, recomputed against the other active filters.
export function CategoryPills({ facets }: { facets: CategoryFacets }) {
  const t = useTranslations("marketplace");
  const { searchParams, setParams } = useCatalogueParams();
  const active = searchParams.get("category");

  const categories = Constants.public.Enums.asset_category;
  const total = categories.reduce((sum, c) => sum + facets[c], 0);

  function pill(key: string | null, label: string, count: number) {
    const isActive = active === key || (key === null && active === null);
    return (
      <button
        key={key ?? "all"}
        type="button"
        onClick={() => setParams({ category: key })}
        aria-pressed={isActive}
        className={cn(
          "rounded-pill px-3 py-1.5 text-sm font-medium transition",
          isActive
            ? "bg-foreground text-surface"
            : "border border-border bg-surface text-foreground hover:border-accent hover:text-accent",
        )}
      >
        {label} <span className="tabular-nums opacity-70">({count})</span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pill(null, t("categories.all"), total)}
      {categories.map((c: AssetCategory) =>
        pill(c, t(`enums.category.${c}`), facets[c]),
      )}
    </div>
  );
}
