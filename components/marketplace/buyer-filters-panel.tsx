"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SEEDED_JURISDICTIONS, jurisdictionName } from "@/lib/jurisdictions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SlidersIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

// Buyer-directory facets behind a Filters toggle (F3 mirror of FiltersPanel): jurisdiction + ticket
// range. Ticket is entered in euros and stored in the URL as cents (ADR-4), applied on submit. The
// URL params (jurisdiction / price_min / price_max) match the asset catalogue, so parseBuyerFilters
// reads them the same way.
export function BuyerFiltersPanel() {
  const t = useTranslations("seller");
  const { searchParams, setParams } = useCatalogueParams();
  const [open, setOpen] = useState(false);

  const centsToEuro = (v: string | null) =>
    v ? String(Math.round(Number(v) / 100)) : "";

  const [jurisdiction, setJurisdiction] = useState(
    searchParams.get("jurisdiction") ?? "",
  );
  const [ticketMin, setTicketMin] = useState(centsToEuro(searchParams.get("price_min")));
  const [ticketMax, setTicketMax] = useState(centsToEuro(searchParams.get("price_max")));

  const activeCount = ["jurisdiction", "price_min", "price_max"].filter((k) =>
    searchParams.get(k),
  ).length;

  const euroToCents = (v: string) =>
    v.trim() ? String(Math.max(0, Math.round(Number(v) * 100))) : null;

  function apply() {
    setParams({
      jurisdiction: jurisdiction || null,
      price_min: euroToCents(ticketMin),
      price_max: euroToCents(ticketMax),
    });
    setOpen(false);
  }

  function clear() {
    setJurisdiction("");
    setTicketMin("");
    setTicketMax("");
    setParams({ jurisdiction: null, price_min: null, price_max: null });
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
        {t("buyers.filters.toggle")}
        {activeCount > 0 ? (
          <span className="rounded-pill bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[320px] max-w-[calc(100vw-2rem)] space-y-4 rounded-card border border-border bg-surface p-4 shadow-lg">
          <p className="text-sm font-semibold text-foreground">
            {t("buyers.filters.heading")}
          </p>

          <Field label={t("buyers.filters.jurisdiction")}>
            <Select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            >
              <option value="">{t("buyers.filters.any")}</option>
              {SEEDED_JURISDICTIONS.map((code) => (
                <option key={code} value={code}>
                  {jurisdictionName(code)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("buyers.filters.ticketMin")}>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={ticketMin}
                onChange={(e) => setTicketMin(e.target.value)}
              />
            </Field>
            <Field label={t("buyers.filters.ticketMax")}>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={ticketMax}
                onChange={(e) => setTicketMax(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              {t("buyers.filters.clear")}
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              {t("buyers.filters.apply")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
