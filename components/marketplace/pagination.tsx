"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

// Pagination, not infinite scroll (design-audit §G, ADR-15 sibling decision).
export function Pagination({
  total,
  page,
  pageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("marketplace");
  const { setParams } = useCatalogueParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const go = (n: number) => setParams({ page: n === 1 ? null : String(n) });
  const items = pageItems(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1 rounded-pill border border-border bg-surface px-3 text-sm text-foreground transition hover:border-accent hover:text-accent disabled:opacity-40"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        {t("pagination.prev")}
      </button>

      {items.map((it, i) =>
        it === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => go(it)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-pill px-3 text-sm font-medium transition",
              it === page
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-surface text-foreground hover:border-accent hover:text-accent",
            )}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-pill border border-border bg-surface px-3 text-sm text-foreground transition hover:border-accent hover:text-accent disabled:opacity-40"
      >
        {t("pagination.next")}
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}

// Compact page list: first, last, current ±1, with ellipses.
function pageItems(page: number, total: number): (number | "…")[] {
  const set = new Set<number>([1, total, page, page - 1, page + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}
