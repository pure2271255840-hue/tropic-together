import { AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardTask } from "@/features/dashboard/types";
import { getPriorityTone } from "@/features/dashboard/utils";

type TaskOverviewProps = {
  dueSoonTasks: DashboardTask[];
  unassignedTasks: DashboardTask[];
};

export function TaskOverview({
  dueSoonTasks,
  unassignedTasks
}: TaskOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">需要注意</p>
            <CardTitle className="mt-2 text-xl">近期任务</CardTitle>
          </div>
          <Badge tone="outline">{dueSoonTasks.length} 项临近</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {dueSoonTasks.length > 0 ? (
            dueSoonTasks.map((task) => <TaskRow key={task.id} task={task} />)
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              title="近期没有临近任务"
              description="带截止时间的准备事项会出现在这里，方便大家提前确认。"
            />
          )}
        </div>

        <div className="border-t border-border pt-5">
          {unassignedTasks.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-coral" aria-hidden="true" />
                还没有负责人
              </div>
              {unassignedTasks.map((task) => (
                <TaskRow key={task.id} task={task} emphasis="owner" />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
              title="没有未分配任务"
              description="目前需要处理的准备事项都有负责人。之后新增任务时，这里会提醒大家认领。"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  emphasis
}: {
  task: DashboardTask;
  emphasis?: "owner";
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-5">{task.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {task.relatedTo} · {task.dueLabel}
          </p>
        </div>
        <Badge tone={getPriorityTone(task.priority)}>{task.priority}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={emphasis === "owner" ? "coral" : "teal"}>
          {task.owner?.name ?? "谁来负责？"}
        </Badge>
        <Badge tone="outline">{task.status}</Badge>
      </div>
    </article>
  );
}
