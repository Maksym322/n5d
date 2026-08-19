import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "ghost";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  solid: "bg-accent text-accent-foreground hover:opacity-90",
  outline:
    "border border-border bg-surface text-foreground hover:border-accent hover:text-accent",
  ghost: "text-foreground hover:bg-background",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
};

// Exported so links and server-rendered elements can share the button look.
export function buttonClasses(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}): string {
  return cn(
    BASE,
    VARIANTS[opts?.variant ?? "solid"],
    SIZES[opts?.size ?? "md"],
    opts?.className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}
