"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";
import { clearedFilterParams, parseRefQuery } from "@/lib/db/asset-filters";
import { interpretSearchQuery } from "@/actions/search";

// Submit-driven, not debounced. A 300 ms debounce is the right shape for a substring match and
// the wrong one for a model call: it would fire an interpretation per keystroke. So the field
// became a form, and the query is sent once, when the user says it is finished (ADR-6).
//
// What does not change is where the state lives. Submit still writes URL search params and the
// page still renders from them, so a pasted link restores the whole query (ADR-3).
export function SearchInput({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const t = useTranslations("marketplace");
  const { searchParams, setParams } = useCatalogueParams();
  const urlValue = searchParams.get("q") ?? "";

  // Controlled, but re-synced when the URL changes elsewhere (a chip removal, "Clear all", a
  // pasted link) using the render-phase adjust-on-prop-change pattern — no effect needed.
  //
  // After an interpreted submit this shows the RESIDUAL query, not the sentence that was typed:
  // the sentence is not in the URL, and if the box kept it, one URL would render two different
  // ways. The chips above the results are what show how the sentence was read.
  const [value, setValue] = useState(urlValue);
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  if (urlValue !== prevUrlValue) {
    setPrevUrlValue(urlValue);
    setValue(urlValue);
  }

  const [pending, startTransition] = useTransition();
  // Discards an interpretation that a newer submit has already overtaken.
  const submitSeq = useRef(0);

  function onChange(next: string) {
    setValue(next);
    // The native type="search" clear affordance (the WebKit ×, or Esc) fires input but never
    // submit, so emptying the box has to be honoured here. One write when it reaches empty —
    // still not one per keystroke.
    if (next === "" && urlValue !== "") setParams(clearedFilterParams(null));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = value.trim();
    const seq = ++submitSeq.current;

    // Three deterministic paths that never reach the model:
    //   empty            — clear the filter slice
    //   no API key       — exactly the behaviour this box had before the feature existed
    //   "Asset #113"     — a public_ref lookup the model could only damage, and which the F1
    //                      end-to-end spec must be able to exercise with no credentials
    if (!raw || !aiEnabled || parseRefQuery(raw) !== null) {
      setParams(clearedFilterParams(raw || null));
      return;
    }

    startTransition(async () => {
      const result = await interpretSearchQuery(raw);
      if (seq !== submitSeq.current) return;
      // Every failure — disabled, unavailable, timed out, unusable output — lands on the same
      // line: the raw sentence as a plain ilike query, which is what the box did before.
      setParams(result.ok ? result.params : clearedFilterParams(raw));
    });
  }

  return (
    <form onSubmit={onSubmit} role="search" aria-busy={pending} className="relative flex-1">
      {/* Decorative only, and dropped on narrow screens: the row squeezes this field to under
          200px there, and the submit button already carries a search icon at that size. */}
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted sm:block" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
        className="pr-11 sm:pl-9 sm:pr-28"
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        // Icon-only where space is tight, labelled from sm up. min-w stops the field reflowing
        // when the label swaps to "Searching…".
        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 sm:min-w-[6rem] sm:px-3"
      >
        <SearchIcon className="h-4 w-4 sm:hidden" />
        <span className="sr-only sm:not-sr-only">
          {pending ? t("search.searching") : t("search.submit")}
        </span>
      </Button>
    </form>
  );
}
