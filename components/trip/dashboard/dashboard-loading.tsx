import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-10 w-64 max-w-full" />
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </main>
  );
}
