import { Sparkles } from "lucide-react";

type MockDataNoticeProps = {
  label: string;
};

export function MockDataNotice({ label }: MockDataNoticeProps) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-border bg-white/75 p-3 text-xs leading-5 text-muted-foreground">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sunset" aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}
