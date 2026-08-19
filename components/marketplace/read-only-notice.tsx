import { useTranslations } from "next-intl";

// F5: rendered in place of a write control when the signed-in user is suspended. The account
// is read-only — every write is already blocked by is_active() in RLS — so the UI must not
// offer an action that will fail; it hides the control and says why. Isomorphic (useTranslations
// works server- and client-side), so it drops into both server pages and client CTA parents.
export function ReadOnlyNotice() {
  const t = useTranslations("common");
  return (
    <p className="rounded-card border border-dashed border-danger/40 bg-danger/5 p-4 text-sm text-danger">
      {t("readOnlyAction")}
    </p>
  );
}
