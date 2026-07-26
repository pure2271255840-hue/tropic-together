"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MapPin, Plane } from "lucide-react";
import { useLocalTripStore } from "@/features/trip/use-local-trip-store";
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
  const { data } = useLocalTripStore(tripId);
  const pendingItineraryCount = data.itineraryVersions.filter(
    (version) =>
      version.status !== "final" &&
      !data.itineraryVotes.some(
        (vote) =>
          vote.versionId === version.id &&
          vote.memberId === data.currentMemberId
      )
  ).length;
  const navItems = [
    { label: "首页", href: tripBase, icon: Home, ready: true, badge: 0 },
    {
      label: "行程",
      href: `${tripBase}/itinerary`,
      icon: CalendarDays,
      ready: true,
      badge: pendingItineraryCount
    },
    { label: "地点", href: `${tripBase}/places`, icon: MapPin, ready: true, badge: 0 }
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/80 bg-white/75 px-5 py-6 backdrop-blur lg:block">
      <div className="flex h-full flex-col">
        <Link href={tripBase} className="focus-ring rounded-lg p-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tropic Together</p>
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
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

        <div className="mt-auto rounded-lg border border-border bg-secondary/60 p-4 text-sm leading-6 text-secondary-foreground">
          <p className="font-medium">Phase 1 数据模式</p>
          <p className="mt-1 text-xs">
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
        active ? "bg-white/20 text-primary-foreground" : "bg-coral text-white"
      )}
    >
      {count}
    </span>
  );
}
