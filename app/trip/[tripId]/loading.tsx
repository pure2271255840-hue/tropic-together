import { Skeleton } from "@/components/ui/skeleton";

export default function TripHomeLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5">
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </main>
  );
}
