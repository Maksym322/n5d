import type { ReactNode } from "react";

export type Attribute = { label: string; value: ReactNode };

// Two-row attribute grid with hairline dividers (design-audit §B). The gap-px over a
// bg-border container renders the dividers; cells sit on bg-surface.
export function AttributeGrid({ items }: { items: Attribute[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-thumb border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="min-w-0 bg-surface px-3 py-2">
          <dt className="truncate text-[11px] uppercase tracking-wide text-muted">
            {item.label}
          </dt>
          <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
