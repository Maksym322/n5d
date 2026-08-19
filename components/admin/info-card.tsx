import type { ReactNode } from "react";

// A titled key/value card for the detail pages. Rows whose value is empty are dropped, so a
// missing website or registration number simply doesn't appear.
export function InfoCard({
  title,
  rows,
  extra,
}: {
  title: string;
  rows: [string, string | null | undefined][];
  extra?: ReactNode;
}) {
  const visible = rows.filter(([, value]) => Boolean(value));
  return (
    <div className="space-y-2 rounded-card border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {visible.length ? (
        <dl className="space-y-1">
          {visible.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {extra ? <p className="pt-1 text-sm text-muted">{extra}</p> : null}
    </div>
  );
}
