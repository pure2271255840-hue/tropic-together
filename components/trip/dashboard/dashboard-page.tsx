import type { DashboardData } from "@/features/dashboard/types";
import { getTripCountdown } from "@/features/dashboard/utils";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { MockDataNotice } from "./mock-data-notice";
import { RecentPlacesCard } from "./recent-places-card";
import { TaskOverview } from "./task-overview";
import { TodayPlanCard } from "./today-plan-card";
import { TripHeader } from "./trip-header";
import { UpcomingTaskCard } from "./upcoming-task-card";

type DashboardPageProps = {
  data: DashboardData;
};

export function DashboardPage({ data }: DashboardPageProps) {
  const countdown = getTripCountdown(data.trip.startDate, data.trip.endDate);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5">
      <TripHeader trip={data.trip} countdown={countdown} />

      <DashboardQuickActions />

      <section
        id="today-plan"
        className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
        aria-label="今日计划与下一项任务"
      >
        <TodayPlanCard plan={data.todayPlan} />
        <UpcomingTaskCard task={data.upcomingTask} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <TaskOverview
          dueSoonTasks={data.dueSoonTasks}
          unassignedTasks={data.unassignedTasks}
        />
        <RecentPlacesCard places={data.recentPlaces} />
      </section>

      <MockDataNotice label={data.mockSourceLabel} />
    </main>
  );
}
