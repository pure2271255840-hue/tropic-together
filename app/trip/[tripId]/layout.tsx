import type { ReactNode } from "react";
import { TripDataProvider } from "@/features/trip/trip-data-provider";
import { decodeRouteParam } from "@/features/trip/route-params";

export default async function TripLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return (
    <TripDataProvider tripId={decodeRouteParam(tripId)}>
      {children}
    </TripDataProvider>
  );
}
