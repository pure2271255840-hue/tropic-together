import { TripHomePage } from "@/components/trip/home/trip-home-page";

export const dynamic = "force-dynamic";

export default async function TripHomeRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TripHomePage tripId={tripId} />;
}
