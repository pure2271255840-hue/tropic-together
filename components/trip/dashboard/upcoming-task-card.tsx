import { AlertTriangle, CalendarClock, ChevronRight, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardTask } from "@/features/dashboard/types";
import { getPriorityTone } from "@/features/dashboard/utils";

type UpcomingTaskCardProps = {
  task: DashboardTask | null;
};

export function UpcomingTaskCard({ task }: UpcomingTaskCardProps) {
  if (!task) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>下一项任务</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
            title="暂时没有紧急任务"
            description="当有截止时间、负责人或订单确认事项时，这里会把下一件需要处理的事提到前面。"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">下一项任务</p>
            <CardTitle className="mt-2 text-xl leading-snug">{task.title}</CardTitle>
          </div>
          <Badge tone={getPriorityTone(task.priority)}>优先级 {task.priority}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-coral" aria-hidden="true" />
          <span>{task.dueLabel}</span>
          <span>·</span>
          <span>{task.status}</span>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{task.note}</p>

        <div className="grid gap-3">
          <TaskMeta
            icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
            label="负责人"
            value={task.owner?.name ?? "谁来负责？"}
          />
          <TaskMeta
            icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
            label="关联内容"
            value={task.relatedTo}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TaskMeta({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/75 p-3">
      <span className="text-teal">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
