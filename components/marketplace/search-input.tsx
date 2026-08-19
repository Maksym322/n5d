"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

export function SearchInput() {
  const t = useTranslations("marketplace");
  const { searchParams, setParams } = useCatalogueParams();
  const urlValue = searchParams.get("q") ?? "";

  // Controlled for debounced input, but re-synced when the URL changes elsewhere (e.g.
  // "Clear all") using the render-phase adjust-on-prop-change pattern — no effect needed.
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
    debounce.current = setTimeout(() => {
      setParams({ q: next.trim() || null });
    }, 300);
  }

  return (
    <div className="relative flex-1">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
        className="pl-9"
      />
    </div>
  );
}
