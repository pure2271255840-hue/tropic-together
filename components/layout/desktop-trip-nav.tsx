"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  ListTodo,
  Map,
  MoreHorizontal,
  Plane
} from "lucide-react";
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

export function DesktopTripNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/80 bg-white/75 px-5 py-6 backdrop-blur lg:block">
      <div className="flex h-full flex-col">
        <Link
          href="/trip/penang-kota-kinabalu-2026"
          className="focus-ring rounded-lg p-2"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tropic Together</p>
              <p className="text-xs text-muted-foreground">Penang × KK 2026</p>
            </div>
          </div>
        </Link>

        <nav className="mt-8 space-y-2" aria-label="旅行导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const className = cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              !item.ready && "cursor-not-allowed opacity-60 hover:bg-transparent"
            );

            if (!item.ready) {
              return (
                <span key={item.label} className={className} aria-disabled="true">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
              );
            }

            return (
              <Link key={item.label} href={item.href} className={cn("focus-ring", className)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-border bg-secondary/60 p-4 text-sm leading-6 text-secondary-foreground">
          <p className="font-medium">下一步建议</p>
          <p className="mt-1 text-xs">
            先把地点和任务接入后，底部导航会逐步打开。
          </p>
        </div>
      </div>
    </aside>
  );
}
