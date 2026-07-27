import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "border border-border bg-muted/80 text-foreground",
  teal: "border border-teal/15 bg-accent text-accent-foreground",
  coral: "border border-coral/15 bg-secondary text-coral",
  sunset: "border border-sunset/20 bg-sunset/10 text-sunset",
  leaf: "border border-leaf/15 bg-leaf/10 text-leaf",
  outline: "border border-border bg-white/85 text-muted-foreground"
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
