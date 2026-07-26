"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MapPin, UserRound } from "lucide-react";
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

export function MobileBottomNav() {
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
    { label: "地点", href: `${tripBase}/places`, icon: MapPin, ready: true, badge: 0 },
    { label: "我的", href: `${tripBase}/me`, icon: UserRound, ready: true, badge: 0 }
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(22,47,54,0.08)] backdrop-blur lg:hidden"
      aria-label="底部导航"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== tripBase && pathname.startsWith(item.href));
          const className = cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium transition",
            active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            !item.ready && "cursor-not-allowed opacity-50"
          );

          if (!item.ready) {
            return (
              <span key={item.label} className={className} aria-disabled="true">
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <NavBadge count={item.badge} />
                </span>
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn("focus-ring", className)}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                <NavBadge count={item.badge} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold leading-none text-white">
      {count}
    </span>
  );
}
