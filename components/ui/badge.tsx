import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-muted text-foreground",
  teal: "bg-accent text-accent-foreground",
  coral: "bg-coral/10 text-coral",
  sunset: "bg-sunset/20 text-amber-800",
  leaf: "bg-leaf/10 text-leaf",
  outline: "border border-border bg-white text-muted-foreground"
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
