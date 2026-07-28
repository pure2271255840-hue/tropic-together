"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const prefetchedTripBases = new Set<string>();

export function usePrefetchTripTabs(tripBase: string) {
  const router = useRouter();

  useEffect(() => {
    if (prefetchedTripBases.has(tripBase)) {
      return;
    }

    prefetchedTripBases.add(tripBase);

    [tripBase, `${tripBase}/itinerary`, `${tripBase}/places`, `${tripBase}/me`]
      .forEach((href) => router.prefetch(href));
  }, [router, tripBase]);
}
