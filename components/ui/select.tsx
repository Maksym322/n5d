import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-thumb border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
