import { ItineraryPage } from "@/components/trip/itinerary/itinerary-page";

export const dynamic = "force-dynamic";

export default async function TripItineraryRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <ItineraryPage tripId={tripId} />;
}
