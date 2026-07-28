"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MapPin, UserRound } from "lucide-react";
import { usePendingItineraryTripCount } from "@/features/trip/use-pending-itinerary-trip-count";
import { usePendingPlaceVoteCount } from "@/features/trip/use-pending-place-vote-count";
import { usePrefetchTripTabs } from "@/features/trip/use-prefetch-trip-tabs";
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
  usePrefetchTripTabs(tripBase);

  const pendingItineraryCount = usePendingItineraryTripCount(tripId);
  const pendingPlaceVoteCount = usePendingPlaceVoteCount(tripId);
  const navItems = [
    { label: "首页", href: tripBase, icon: Home, ready: true, badge: 0 },
    {
      label: "行程",
      href: `${tripBase}/itinerary`,
      icon: CalendarDays,
      ready: true,
      badge: pendingItineraryCount
    },
    {
      label: "地点",
      href: `${tripBase}/places`,
      icon: MapPin,
      ready: true,
      badge: pendingPlaceVoteCount
    },
    { label: "我的", href: `${tripBase}/me`, icon: UserRound, ready: true, badge: 0 }
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_48px_rgba(23,23,23,0.07)] backdrop-blur-xl lg:hidden"
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
            active
              ? "bg-secondary text-primary"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-primary",
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
