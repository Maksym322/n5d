import { useLocale, useTranslations } from "next-intl";
import { buildChartGeometry } from "@/lib/chart";
import { formatMoneyCompact } from "@/lib/format";
import type { PricePoint } from "@/lib/db/assets";

// Inline-SVG Market Trend chart (ADR-15): 6 annual points, both axes labelled, ~250×150,
// tokens inherited. Server component — no interactivity.
export function MarketTrendChart({ points }: { points: PricePoint[] }) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const geo = buildChartGeometry(points);

  const width = 250;
  const height = 150;

  return (
    <figure className="w-full max-w-[250px]">
      <figcaption className="mb-1 text-xs font-semibold text-muted">
        {t("chart.title")}
      </figcaption>
      {geo ? (
        <svg
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          width="100%"
          role="img"
          aria-label={t("chart.title")}
          className="overflow-visible"
        >
          {/* y gridlines + labels */}
          {geo.yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line
                x1={geo.plot.left}
                x2={geo.plot.right}
                y1={tick.y}
                y2={tick.y}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={geo.plot.left - 6}
                y={tick.y + 3}
                textAnchor="end"
                fontSize={8}
                className="fill-muted"
              >
                {formatMoneyCompact(tick.valueCents, "EUR", locale)}
              </text>
            </g>
          ))}

          {/* x axis labels (years) */}
          {geo.xTicks.map((tick, i) => (
            <text
              key={`x-${i}`}
              x={tick.x}
              y={geo.plot.bottom + 12}
              textAnchor="middle"
              fontSize={8}
              className="fill-muted"
            >
              {tick.year}
            </text>
          ))}

          {/* trend line */}
          <polyline
            points={geo.polyline}
            fill="none"
            className="stroke-foreground"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* data points */}
          {geo.dots.map((d, i) => (
            <circle
              key={`d-${i}`}
              cx={d.x}
              cy={d.y}
              r={2.5}
              className="fill-surface stroke-foreground"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      ) : (
        <div
          className="flex items-center justify-center rounded-thumb border border-dashed border-border text-xs text-muted"
          style={{ width, height }}
        >
          {t("chart.empty")}
        </div>
      )}
    </figure>
  );
}
