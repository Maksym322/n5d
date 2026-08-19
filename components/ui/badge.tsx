import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "danger" | "neutral" | "accent";

const TONES: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-background text-muted",
  accent: "bg-accent/10 text-accent",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
