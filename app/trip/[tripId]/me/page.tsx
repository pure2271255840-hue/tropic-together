import { MePage } from "@/components/trip/me/me-page";
import { decodeRouteParam } from "@/features/trip/route-params";

export default async function TripMeRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <MePage tripId={decodeRouteParam(tripId)} />;
}
