import { MePage } from "@/components/trip/me/me-page";

export const dynamic = "force-dynamic";

export default async function TripMeRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <MePage tripId={tripId} />;
}
