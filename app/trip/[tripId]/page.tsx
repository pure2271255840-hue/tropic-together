import { DashboardPage } from "@/components/trip/dashboard/dashboard-page";
import { getDashboardData } from "@/features/dashboard/mock-data";

export const dynamic = "force-dynamic";

export default async function TripDashboardRoute({
  params
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const dashboard = await getDashboardData(tripId);

  return <DashboardPage data={dashboard} />;
}
