"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Single place where catalogue filter state is written back to the URL (ADR-3). Any change
// other than paging itself resets the page, so a narrowed result set starts on page 1.
export function useCatalogueParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildQuery = useCallback(
    (patch: Record<string, string | null>): string => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in patch)) params.delete("page");
      return params.toString();
    },
    [searchParams],
  );

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const qs = buildQuery(patch);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [buildQuery, pathname, router],
  );

  return { searchParams, setParams };
}
