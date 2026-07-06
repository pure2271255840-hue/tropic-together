import { CalendarDays, MapPin, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "添加地点", icon: MapPin, ready: false },
  { label: "新增任务", icon: Plus, ready: false },
  { label: "上传订单", icon: Upload, ready: false },
  { label: "查看今日行程", icon: CalendarDays, ready: true, href: "#today-plan" }
];

export function DashboardQuickActions() {
  return (
    <section aria-label="快捷操作" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;

        if (action.ready && action.href) {
          return (
            <a
              key={action.label}
              href={action.href}
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </a>
          );
        }

        return (
          <Button key={action.label} type="button" variant="outline" disabled>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </Button>
        );
      })}
    </section>
  );
}
