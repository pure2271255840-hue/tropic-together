"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div
        className={cn(
          "w-full max-w-lg rounded-t-[1.75rem] border border-border bg-white shadow-lift sm:rounded-[1.5rem]",
          "max-h-[calc(100vh-2rem)] overflow-y-auto"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-white/95 p-5 backdrop-blur">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-6">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-primary"
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
