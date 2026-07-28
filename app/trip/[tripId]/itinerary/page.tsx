import { ItineraryPage } from "@/components/trip/itinerary/itinerary-page";
import { decodeRouteParam } from "@/features/trip/route-params";

export const dynamic = "force-dynamic";

export default async function TripItineraryRoute({
  params,
  searchParams
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ open?: string }>;
}) {
  const { tripId } = await params;
  const { open } = await searchParams;
  const decodedTripId = decodeRouteParam(tripId);

  return (
    <ItineraryPage
      tripId={decodedTripId}
      initialSelectedTripId={open === "detail" ? decodedTripId : null}
    />
  );
}
