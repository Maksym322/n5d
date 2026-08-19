import { describe, it, expect } from "vitest";
import { buildChartGeometry, type ChartPoint } from "@/lib/chart";

const series: ChartPoint[] = [
  { year: 2020, valueCents: 1_000_000 },
  { year: 2021, valueCents: 1_500_000 },
  { year: 2022, valueCents: 1_200_000 },
  { year: 2023, valueCents: 2_000_000 },
  { year: 2024, valueCents: 2_400_000 },
  { year: 2025, valueCents: 3_000_000 },
];

describe("buildChartGeometry", () => {
  it("returns null for fewer than two points", () => {
    expect(buildChartGeometry([])).toBeNull();
    expect(buildChartGeometry([{ year: 2020, valueCents: 100 }])).toBeNull();
  });

  it("emits one dot and x-tick per point, five y-ticks", () => {
    const geo = buildChartGeometry(series);
    expect(geo).not.toBeNull();
    if (!geo) return;
    expect(geo.dots).toHaveLength(6);
    expect(geo.xTicks).toHaveLength(6);
    expect(geo.yTicks).toHaveLength(5);
    expect(geo.polyline.split(" ")).toHaveLength(6);
  });

  it("anchors the first dot at the left edge and the last at the right", () => {
    const geo = buildChartGeometry(series);
    if (!geo) throw new Error("expected geometry");
    expect(geo.dots[0].x).toBeCloseTo(geo.plot.left);
    expect(geo.dots[geo.dots.length - 1].x).toBeCloseTo(geo.plot.right);
  });

  it("maps the maximum value to the top and zero to the baseline", () => {
    const geo = buildChartGeometry(series);
    if (!geo) throw new Error("expected geometry");
    const maxDot = geo.dots[5]; // 3_000_000 is the series max
    expect(maxDot.y).toBeCloseTo(geo.plot.top);
    const zeroTick = geo.yTicks[0]; // fraction 0
    expect(zeroTick.y).toBeCloseTo(geo.plot.bottom);
  });
});
