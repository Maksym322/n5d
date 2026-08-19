import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-border accent-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
