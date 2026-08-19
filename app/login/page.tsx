import { getTranslations } from "next-intl/server";
import { signInAs, signInAsAccount } from "@/actions/auth";
import { seededAccountsByRole } from "@/lib/demo-accounts";

const ROLES = ["BUYER", "SELLER", "MANAGER"] as const;

export default async function LoginPage() {
  const t = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("login.title")}</h1>
        <p className="text-sm text-muted">{t("login.subtitle")}</p>
      </div>

      {/* Default path — the three quick role buttons */}
      <form className="grid gap-3">
        {ROLES.map((role) => (
          <button
            key={role}
            formAction={signInAs.bind(null, role)}
            className="rounded-card border border-border bg-surface px-5 py-3 text-base font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            {t(`roles.${role}`)}
          </button>
        ))}
      </form>

      {/* Specific-account picker — grouped by role, read from the seed definitions */}
      <details className="rounded-card border border-border bg-surface">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
          {t("login.pickerToggle")}
        </summary>
        <form className="space-y-4 border-t border-border p-4">
          {ROLES.map((role) => (
            <div key={role} className="space-y-1.5">
              <h2 className="text-[11px] uppercase tracking-wide text-muted">
                {t(`login.groups.${role}`)}
              </h2>
              <ul className="space-y-1.5">
                {seededAccountsByRole(role).map((acc) => (
                  <li key={acc.email}>
                    <button
                      formAction={signInAsAccount.bind(null, acc.email)}
                      className="flex w-full flex-col items-start gap-0.5 rounded-thumb border border-border px-3 py-2 text-left transition hover:border-accent"
                    >
                      <span className="font-mono text-sm font-medium text-foreground">
                        {acc.email}
                      </span>
                      <span className="text-xs text-muted">{acc.note}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </form>
      </details>

      <p className="text-center text-xs text-muted">{t("login.note")}</p>
    </main>
  );
}
