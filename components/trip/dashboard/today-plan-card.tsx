import { CalendarDays, MapPin, Navigation, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TodayPlan } from "@/features/dashboard/types";

type TodayPlanCardProps = {
  plan: TodayPlan | null;
};

export function TodayPlanCard({ plan }: TodayPlanCardProps) {
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>今日计划</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
            title="还没有今日计划"
            description="确认每日时间轴后，这里会显示集合时间、下一站和负责人，旅行当天不用翻聊天记录。"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">今日计划</p>
            <CardTitle className="mt-2 text-2xl leading-snug">
              {plan.dateLabel} · {plan.city}
            </CardTitle>
          </div>
          <Badge tone="sunset">{plan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-accent/60 p-4">
          <p className="text-sm text-accent-foreground/80">下一站</p>
          <p className="mt-2 text-2xl font-semibold leading-snug">
            {plan.nextActivity}
          </p>
          <p className="mt-2 text-sm leading-6 text-accent-foreground/80">
            {plan.theme}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoLine
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            label="集合时间"
            value={plan.meetingTime}
          />
          <InfoLine
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            label="集合地点"
            value={plan.meetingPlace}
          />
          <InfoLine
            icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
            label="负责人"
            value={plan.owner.name}
          />
          <InfoLine
            icon={<Navigation className="h-4 w-4" aria-hidden="true" />}
            label="重要提醒"
            value={plan.reminder}
          />
        </div>

        <Button type="button" variant="quiet" className="w-full sm:w-auto">
          <Navigation className="h-4 w-4" aria-hidden="true" />
          查看路线
        </Button>
      </CardContent>
    </Card>
  );
}

function InfoLine({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-white p-3">
      <span className="mt-0.5 text-teal">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium leading-5">{value}</p>
      </div>
    </div>
  );
}
