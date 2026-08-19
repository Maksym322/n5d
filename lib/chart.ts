// Pure geometry for the inline-SVG Market Trend chart (ADR-15). No React, no DOM — kept
// separate so it is unit-testable (ADR-14). Coordinates are in SVG user units.

export type ChartPoint = { year: number; valueCents: number };

export type ChartGeometry = {
  width: number;
  height: number;
  plot: { left: number; right: number; top: number; bottom: number };
  polyline: string; // "x1,y1 x2,y2 …"
  dots: { x: number; y: number }[];
  xTicks: { x: number; year: number }[];
  yTicks: { y: number; valueCents: number }[];
};

const PLOT = { left: 42, right: 8, top: 10, bottom: 22 } as const;
const Y_TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

// Returns null when there is too little data to draw a line (renders an empty state).
export function buildChartGeometry(
  points: ChartPoint[],
  width = 250,
  height = 150,
): ChartGeometry | null {
  if (points.length < 2) return null;

  const left = PLOT.left;
  const right = width - PLOT.right;
  const top = PLOT.top;
  const bottom = height - PLOT.bottom;

  const values = points.map((p) => p.valueCents);
  const max = Math.max(...values, 1); // avoid divide-by-zero; all-zero series flattens to axis
  const n = points.length;

  const x = (i: number) => left + ((right - left) * i) / (n - 1);
  const y = (v: number) => bottom - (Math.max(0, v) / max) * (bottom - top);

  const dots = points.map((p, i) => ({ x: x(i), y: y(p.valueCents) }));
  const polyline = dots.map((d) => `${round(d.x)},${round(d.y)}`).join(" ");

  const xTicks = points.map((p, i) => ({ x: x(i), year: p.year }));
  const yTicks = Y_TICK_FRACTIONS.map((f) => ({
    y: y(f * max),
    valueCents: Math.round(f * max),
  }));

  return {
    width,
    height,
    plot: { left, right, top, bottom },
    polyline,
    dots,
    xTicks,
    yTicks,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
