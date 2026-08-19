"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Constants } from "@/lib/types/database";
import { SEEDED_JURISDICTIONS, jurisdictionName } from "@/lib/jurisdictions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SlidersIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

// Advanced facets behind a Filters toggle (design-audit §E). Price is entered in euros and
// stored in the URL as cents (ADR-4); applied on submit rather than per keystroke.
export function FiltersPanel() {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const { searchParams, setParams } = useCatalogueParams();
  const [open, setOpen] = useState(false);

  const centsToEuro = (v: string | null) =>
    v ? String(Math.round(Number(v) / 100)) : "";

  const [jurisdiction, setJurisdiction] = useState(
    searchParams.get("jurisdiction") ?? "",
  );
  const [dealType, setDealType] = useState(searchParams.get("deal_type") ?? "");
  const [priceMin, setPriceMin] = useState(centsToEuro(searchParams.get("price_min")));
  const [priceMax, setPriceMax] = useState(centsToEuro(searchParams.get("price_max")));

  // These four are seeded from the URL, so anything that writes those params from outside this
  // panel — a removed chip, "Clear all", an interpreted search, a pasted link — would otherwise
  // leave the selects showing the previous values. Same render-phase resync the search box uses.
  const paramSignature = ["jurisdiction", "deal_type", "price_min", "price_max"]
    .map((k) => searchParams.get(k) ?? "")
    .join("|");
  const [prevSignature, setPrevSignature] = useState(paramSignature);
  if (paramSignature !== prevSignature) {
    setPrevSignature(paramSignature);
    setJurisdiction(searchParams.get("jurisdiction") ?? "");
    setDealType(searchParams.get("deal_type") ?? "");
    setPriceMin(centsToEuro(searchParams.get("price_min")));
    setPriceMax(centsToEuro(searchParams.get("price_max")));
  }

  const activeCount = ["jurisdiction", "deal_type", "price_min", "price_max"].filter(
    (k) => searchParams.get(k),
  ).length;

  const euroToCents = (v: string) =>
    v.trim() ? String(Math.max(0, Math.round(Number(v) * 100))) : null;

  function apply() {
    setParams({
      jurisdiction: jurisdiction || null,
      deal_type: dealType || null,
      price_min: euroToCents(priceMin),
      price_max: euroToCents(priceMax),
    });
    setOpen(false);
  }

  function clear() {
    setJurisdiction("");
    setDealType("");
    setPriceMin("");
    setPriceMax("");
    setParams({
      jurisdiction: null,
      deal_type: null,
      price_min: null,
      price_max: null,
    });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-sm font-medium transition",
          activeCount > 0
            ? "border-accent text-accent"
            : "border-border text-foreground hover:border-accent hover:text-accent",
        )}
      >
        <SlidersIcon className="h-4 w-4" />
        {t("filters.toggle")}
        {activeCount > 0 ? (
          <span className="rounded-pill bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[320px] max-w-[calc(100vw-2rem)] space-y-4 rounded-card border border-border bg-surface p-4 shadow-lg">
          <p className="text-sm font-semibold text-foreground">
            {t("filters.heading")}
          </p>

          <Field label={t("filters.jurisdiction")}>
            <Select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            >
              <option value="">{t("filters.any")}</option>
              {SEEDED_JURISDICTIONS.map((code) => (
                <option key={code} value={code}>
                  {jurisdictionName(code, locale)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("filters.dealType")}>
            <Select value={dealType} onChange={(e) => setDealType(e.target.value)}>
              <option value="">{t("filters.any")}</option>
              {Constants.public.Enums.deal_type.map((d) => (
                <option key={d} value={d}>
                  {t(`enums.dealType.${d}`)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("filters.priceMin")}>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </Field>
            <Field label={t("filters.priceMax")}>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              {t("filters.clear")}
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
