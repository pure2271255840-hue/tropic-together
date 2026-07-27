"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MapPin, Plane, UserRound } from "lucide-react";
import { usePendingItineraryTripCount } from "@/features/trip/use-pending-itinerary-trip-count";
import { cn } from "@/lib/utils";

function tripInfoFromPath(pathname: string) {
  const [, firstSegment, tripId] = pathname.split("/");

  const resolvedTripId =
    firstSegment === "trip" && tripId ? tripId : "penang-kota-kinabalu-2026";

  return {
    tripId: resolvedTripId,
    tripBase: `/trip/${resolvedTripId}`
  };
}

export function DesktopTripNav() {
  const pathname = usePathname();
  const { tripId, tripBase } = tripInfoFromPath(pathname);
  const pendingItineraryCount = usePendingItineraryTripCount(tripId);
  const navItems = [
    { label: "首页", href: tripBase, icon: Home, ready: true, badge: 0 },
    {
      label: "行程",
      href: `${tripBase}/itinerary`,
      icon: CalendarDays,
      ready: true,
      badge: pendingItineraryCount
    },
    { label: "地点", href: `${tripBase}/places`, icon: MapPin, ready: true, badge: 0 },
    { label: "我的", href: `${tripBase}/me`, icon: UserRound, ready: true, badge: 0 }
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/80 bg-white/82 px-5 py-6 shadow-[12px_0_40px_rgba(23,23,23,0.035)] backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col">
        <Link href={tripBase} className="focus-ring rounded-lg p-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1.125rem] bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(242,99,76,0.22)]">
              <Plane className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Tropic Together</p>
              <p className="text-xs text-muted-foreground">Penang x KK 2026</p>
            </div>
          </div>
        </Link>

        <nav className="mt-8 space-y-2" aria-label="旅行导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== tripBase && pathname.startsWith(item.href));
            const className = cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
              active
                ? "bg-secondary text-primary shadow-[inset_0_0_0_1px_rgba(242,99,76,0.12)]"
                : "text-muted-foreground hover:bg-secondary/55 hover:text-primary",
              !item.ready && "cursor-not-allowed opacity-60 hover:bg-transparent"
            );

            if (!item.ready) {
              return (
                <span key={item.label} className={className} aria-disabled="true">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <NavBadge count={item.badge} active={active} />
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn("focus-ring", className)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.label}</span>
                <NavBadge count={item.badge} active={active} />
              </Link>
            );
          })}
        </nav>

        <div className="corner-mark mt-auto rounded-[1.25rem] border border-primary/10 bg-secondary/60 p-4 text-sm leading-6 text-secondary-foreground">
          <p className="font-medium text-foreground">Phase 1 数据模式</p>
          <p className="mt-1 text-xs text-muted-foreground">
            配置 Supabase 后远端同步；未配置时继续使用本地数据。
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
        active ? "bg-primary text-white" : "bg-primary text-white"
      )}
    >
      {count}
    </span>
  );
}
