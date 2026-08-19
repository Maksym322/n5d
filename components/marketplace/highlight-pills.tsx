import { useTranslations } from "next-intl";

export function HighlightPills({
  items,
  max = 3,
}: {
  items: string[];
  max?: number;
}) {
  const t = useTranslations("marketplace");
  if (items.length === 0) return null;

  const shown = items.slice(0, max);
  const rest = items.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((item, i) => (
        <span
          key={i}
          className="rounded-pill bg-background px-2.5 py-0.5 text-xs font-medium text-muted"
        >
          {item}
        </span>
      ))}
      {rest > 0 ? (
        <span className="rounded-pill bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
          {t("listing.more", { count: rest })}
        </span>
      ) : null}
    </div>
  );
}
