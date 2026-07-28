import { PlacesPage } from "@/components/trip/places/places-page";
import { decodeRouteParam } from "@/features/trip/route-params";

export const dynamic = "force-dynamic";

export default async function TripPlacesRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <PlacesPage tripId={decodeRouteParam(tripId)} />;
}
