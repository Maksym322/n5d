// Tiny class-name joiner. No tailwind-merge — we don't compose conflicting utilities,
// we pass explicit class strings (ADR-17).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
