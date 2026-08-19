"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

// Registry search + filter controls. They write straight to the URL search params through the
// existing catalogue hook (ADR-3), which is generic and keyed on the pathname, so it drives
// /admin/* unchanged. Any change other than paging resets to page 1.

export function RegistrySearch({ tab }: { tab: "buyers" | "sellers" | "assets" }) {
  const t = useTranslations("admin");
  const { searchParams, setParams } = useCatalogueParams();
  const urlValue = searchParams.get("q") ?? "";

  // Controlled + debounced, re-synced when the URL changes elsewhere (render-phase adjust-on-
  // prop-change, matching the marketplace search input — no effect needed).
  const [value, setValue] = useState(urlValue);
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  if (urlValue !== prevUrlValue) {
    setPrevUrlValue(urlValue);
    setValue(urlValue);
  }

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onChange(next: string) {
    setValue(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParams({ q: next.trim() || null }), 300);
  }

  return (
    <div className="relative min-w-[16rem] flex-1">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(`search.${tab}`)}
        aria-label={t("search.label")}
        className="pl-9"
      />
    </div>
  );
}

export function RegistrySelect({
  param,
  label,
  anyLabel,
  options,
}: {
  param: string;
  label: string;
  anyLabel: string;
  options: { value: string; label: string }[];
}) {
  const { searchParams, setParams } = useCatalogueParams();
  const current = searchParams.get(param) ?? "";

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <Select
        value={current}
        onChange={(e) => setParams({ [param]: e.target.value || null })}
        className="w-auto min-w-[8rem]"
        aria-label={label}
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
