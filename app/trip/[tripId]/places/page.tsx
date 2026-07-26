import { PlacesPage } from "@/components/trip/places/places-page";

export const dynamic = "force-dynamic";

export default async function TripPlacesRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <PlacesPage tripId={tripId} />;
}
