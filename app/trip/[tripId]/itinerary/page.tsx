import { ItineraryPage } from "@/components/trip/itinerary/itinerary-page";
import { decodeRouteParam } from "@/features/trip/route-params";

export const dynamic = "force-dynamic";

export default async function TripItineraryRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <ItineraryPage tripId={decodeRouteParam(tripId)} />;
}
