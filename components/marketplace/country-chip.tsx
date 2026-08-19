import { jurisdictionName } from "@/lib/jurisdictions";

// A deliberate country-code chip rather than an emoji flag: regional-indicator flag glyphs
// don't render on many platforms (Windows shows the letters anyway), so we show the ISO
// alpha-2 code as the primary mark, with the country name beneath.
export function CountryChip({ code }: { code: string }) {
  const cc = code.toUpperCase();
  return (
    <div className="flex h-[78px] w-[136px] flex-col items-center justify-center gap-0.5 rounded-thumb border border-border bg-background">
      <span className="text-2xl font-bold tracking-widest text-foreground">{cc}</span>
      <span className="text-[11px] text-muted">{jurisdictionName(cc)}</span>
    </div>
  );
}
