import { TripHomePage } from "@/components/trip/home/trip-home-page";
import { decodeRouteParam } from "@/features/trip/route-params";

export const dynamic = "force-dynamic";

export default async function TripHomeRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TripHomePage tripId={decodeRouteParam(tripId)} />;
}
