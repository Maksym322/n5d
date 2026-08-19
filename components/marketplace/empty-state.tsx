import type { ReactNode } from "react";
import { InboxIcon } from "@/components/ui/icons";

// Generic empty state used across the buyer surfaces (catalogue, messages). The caller
// supplies the copy and an optional action so the suggestion can be context-specific.
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="text-3xl text-muted">{icon ?? <InboxIcon />}</div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
