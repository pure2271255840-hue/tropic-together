"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ListTodo, Map, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "首页", href: "/trip/penang-kota-kinabalu-2026", icon: Home, ready: true },
  { label: "地图", href: "/trip/penang-kota-kinabalu-2026/map", icon: Map, ready: false },
  {
    label: "行程",
    href: "/trip/penang-kota-kinabalu-2026/itinerary",
    icon: CalendarDays,
    ready: false
  },
  { label: "任务", href: "/trip/penang-kota-kinabalu-2026/tasks", icon: ListTodo, ready: false },
  { label: "更多", href: "/trip/penang-kota-kinabalu-2026/more", icon: MoreHorizontal, ready: false }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(22,47,54,0.08)] backdrop-blur lg:hidden"
      aria-label="底部导航"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const className = cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium transition",
            active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
            !item.ready && "cursor-not-allowed opacity-50"
          );

          if (!item.ready) {
            return (
              <span key={item.label} className={className} aria-disabled="true">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </span>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={cn("focus-ring", className)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
