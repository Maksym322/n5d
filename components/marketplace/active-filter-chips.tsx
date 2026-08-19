"use client";

import { useLocale, useTranslations } from "next-intl";
import { XIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";
import {
  clearedFilterParams,
  hasActiveFilters,
  parseAssetFilters,
} from "@/lib/db/asset-filters";
import { formatMoneyCompact } from "@/lib/format";
import { jurisdictionName } from "@/lib/jurisdictions";

// Every active filter, as a removable chip above the results.
//
// This exists because of natural-language search, and it is not decoration: a query interpreted
// by a model and applied invisibly is worse than no interpretation at all. The chips are how the
// reading becomes visible, and how a wrong one is corrected — one click, no re-typing.
//
// It parses the URL with parseAssetFilters, the same function listAssets was given on the server,
// so a chip cannot claim a filter the query did not actually apply. Importing from
// lib/db/asset-filters (pure) rather than lib/db/assets keeps the Supabase client out of the
// bundle; the two are re-exported from the same place for exactly this reason.
export function ActiveFilterChips() {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const { searchParams, setParams } = useCatalogueParams();

  const filters = parseAssetFilters(Object.fromEntries(searchParams.entries()));
  if (!hasActiveFilters(filters)) return null;

  const money = (cents: number) => formatMoneyCompact(cents, "EUR", locale);

  const chips: { key: string; label: string; patch: Record<string, string | null> }[] = [];

  if (filters.category !== null) {
    chips.push({
      key: "category",
      label: t(`enums.category.${filters.category}`),
      patch: { category: null },
    });
  }

  if (filters.jurisdiction !== null) {
    chips.push({
      key: "jurisdiction",
      label: jurisdictionName(filters.jurisdiction, locale),
      patch: { jurisdiction: null },
    });
  }

  if (filters.dealType !== null) {
    chips.push({
      key: "deal_type",
      label: t(`enums.dealType.${filters.dealType}`),
      patch: { deal_type: null },
    });
  }

  // One chip for the range, clearing both bounds. Half a price range is rarely what anyone wants
  // removed; the filters panel is still the way to edit a single bound.
  const { priceMinCents, priceMaxCents } = filters;
  if (priceMinCents !== null || priceMaxCents !== null) {
    const label =
      priceMinCents !== null && priceMaxCents !== null
        ? t("chips.priceRange", { min: money(priceMinCents), max: money(priceMaxCents) })
        : priceMinCents !== null
          ? t("chips.priceMin", { value: money(priceMinCents) })
          : t("chips.priceMax", { value: money(priceMaxCents ?? 0) });
    chips.push({ key: "price", label, patch: { price_min: null, price_max: null } });
  }

  if (filters.q !== null) {
    chips.push({
      key: "q",
      label: t("chips.query", { value: filters.q }),
      patch: { q: null },
    });
  }

  return (
    <div
      role="group"
      aria-label={t("chips.heading")}
      aria-live="polite"
      className="flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => setParams(chip.patch)}
          aria-label={t("chips.remove", { label: chip.label })}
          className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
        >
          {chip.label}
          <XIcon className="h-3.5 w-3.5 opacity-60" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => setParams(clearedFilterParams(null))}
        className="rounded-pill px-2 py-1.5 text-sm text-muted underline-offset-4 transition hover:text-accent hover:underline"
      >
        {t("filters.clear")}
      </button>
    </div>
  );
}
