import type { ReactNode } from "react";
import { requireManager } from "@/lib/db/session";

// Guards the whole Platform Manager area in one place: a non-manager is redirected out before
// any admin page renders. Security does not rest on this alone — the registry reads still run
// under RLS (is_manager()) and every moderation write re-asserts the role (ADR-2) — but it
// keeps a non-manager from ever seeing an empty admin shell.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireManager();
  return <div className="mx-auto max-w-[1240px] space-y-6 px-6 py-8">{children}</div>;
}
