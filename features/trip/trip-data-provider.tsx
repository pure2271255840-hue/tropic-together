"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo
} from "react";
import { useLocalTripStore } from "./use-local-trip-store";

export type TripDataStore = ReturnType<typeof useLocalTripStore>;

type TripDataContextValue = {
  tripId: string;
  store: TripDataStore;
};

const TripDataContext = createContext<TripDataContextValue | null>(null);

export function TripDataProvider({
  tripId,
  children
}: {
  tripId: string;
  children: ReactNode;
}) {
  const store = useLocalTripStore(tripId);
  const value = useMemo(() => ({ tripId, store }), [store, tripId]);

  return (
    <TripDataContext.Provider value={value}>
      {children}
    </TripDataContext.Provider>
  );
}

export function useTripDataStore() {
  const context = useContext(TripDataContext);

  if (!context) {
    throw new Error("useTripDataStore must be used inside TripDataProvider.");
  }

  return context.store;
}

export function useSharedTripId() {
  const context = useContext(TripDataContext);

  if (!context) {
    throw new Error("useSharedTripId must be used inside TripDataProvider.");
  }

  return context.tripId;
}
