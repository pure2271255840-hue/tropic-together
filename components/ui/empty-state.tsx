import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-white/75 p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            {icon}
          </span>
        ) : null}
        <div className="space-y-2">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
