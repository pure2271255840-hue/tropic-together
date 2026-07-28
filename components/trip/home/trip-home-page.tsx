"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Navigation,
  Route,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/use-auth-session";
import {
  routePlanForItineraryDay,
  type ItineraryRoutePlan
} from "@/features/trip/itinerary-routes";
import {
  readCachedTripGroups,
  writeCachedTripGroups
} from "@/features/trip/trip-group-cache";
import { listTripGroups, loadTripData } from "@/features/trip/trip-storage";
import { formatDateLabel, planPhaseLabels } from "@/features/trip/trip-labels";
import type {
  ItineraryDay,
  ItineraryVersion,
  TravelPlace,
  TripMember,
  TripPhase1Data
} from "@/features/trip/types";
import { cn } from "@/lib/utils";

type TripHomePageProps = {
  tripId: string;
};

export function TripHomePage({ tripId }: TripHomePageProps) {
  const auth = useAuthSession();
  const [confirmedTrip, setConfirmedTrip] = useState<TripPhase1Data | null>(null);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function applyConfirmedTripGroups(
      groups: Awaited<ReturnType<typeof listTripGroups>>
    ) {
      const trips = await Promise.all(groups.map((group) => loadTripData(group.id)));
      const confirmedTrips = trips
        .filter(isConfirmedTrip)
        .sort(compareTripsByNearestTime);

      if (!isCancelled) {
        setConfirmedTrip(confirmedTrips[0] ?? null);
        setIsLoadingTrips(false);
      }
    }

    async function loadConfirmedTrip() {
      if (!auth.user) {
        setConfirmedTrip(null);
        setIsLoadingTrips(false);
        return;
      }

      const cachedGroups = readCachedTripGroups(auth.user.id);

      if (cachedGroups) {
        void applyConfirmedTripGroups(cachedGroups);
      } else {
        setIsLoadingTrips(true);
      }

      const groups = await listTripGroups(tripId);

      writeCachedTripGroups(auth.user.id, groups);
      await applyConfirmedTripGroups(groups);
    }

    if (auth.isLoading && !auth.user) {
      setIsLoadingTrips(true);
    } else {
      void loadConfirmedTrip();
    }

    return () => {
      isCancelled = true;
    };
  }, [auth.isLoading, auth.user, tripId]);

  const confirmedVersion = confirmedTrip
    ? getConfirmedVersion(confirmedTrip)
    : undefined;
  const confirmedPlaceById = useMemo(
    () => new Map(confirmedTrip?.places.map((place) => [place.id, place]) ?? []),
    [confirmedTrip]
  );
  const nextDay =
    confirmedTrip && confirmedVersion
      ? findNextVersionDay(confirmedVersion, confirmedTrip.trip.timezone)
      : undefined;
  const nextDayRoutePlan =
    confirmedTrip && nextDay
      ? routePlanForItineraryDay(
          nextDay,
          confirmedPlaceById,
          confirmedTrip.trip.hotelAddress,
          confirmedTrip.trip.hotelMapUrl
        )
      : null;

  return (
    <main className="page-shell">
      <section>
        <div>
          <p className="page-kicker">
            今日行程
          </p>
          <h1 className="page-title">首页</h1>
        </div>
      </section>

      {isLoadingTrips ? (
        <HomeLoadingState />
      ) : confirmedTrip ? (
        <section className="corner-mark surface-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                最近已确认行程
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-foreground">
                {confirmedTrip.trip.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {confirmedTrip.trip.startDate} 至 {confirmedTrip.trip.endDate}
              </p>
            </div>
            <Badge tone="teal" className="shrink-0">
              {planPhaseLabels[confirmedTrip.trip.phase]}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium transition hover:border-primary/25 hover:bg-secondary/45 hover:text-primary"
              href={`/trip/${confirmedTrip.trip.id}/itinerary`}
            >
              <Route className="h-4 w-4" aria-hidden="true" />
              打开行程
            </Link>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {confirmedTrip.members.map((member) => (
              <MemberPill key={member.id} member={member} />
            ))}
          </div>
        </section>
      ) : (
        <section className="surface-card-muted text-center">
          <p className="text-base font-semibold">还没有已确认的行程</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            首页只展示已确认且时间最近的行程。去行程页确认最终版后，这里会显示下一天行程。
          </p>
          <Link
            className="focus-ring mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_rgba(242,99,76,0.22)] transition hover:bg-primary/90"
            href={`/trip/${tripId}/itinerary`}
          >
            去行程页
          </Link>
        </section>
      )}

      {!isLoadingTrips && confirmedTrip ? (
        <NextDayItineraryCard
          day={nextDay}
          placeById={confirmedPlaceById}
          routePlan={nextDayRoutePlan}
        />
      ) : null}

    </main>
  );
}

function HomeLoadingState() {
  return (
    <section className="surface-card" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-20" />
      </div>
    </section>
  );
}

function NextDayItineraryCard({
  day,
  placeById,
  routePlan
}: {
  day?: ItineraryDay;
  placeById: Map<string, TravelPlace>;
  routePlan: ItineraryRoutePlan | null;
}) {
  return (
    <section className="corner-mark rounded-[1.25rem] border border-primary/15 bg-secondary/70 p-5 text-foreground shadow-soft">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary">
          <Navigation className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">下一天即将执行的行程</p>
          <h2 className="mt-1 text-lg font-semibold">
            {day ? `${formatDateLabel(day.date)} / ${day.title}` : "暂无下一天行程"}
          </h2>
          {day ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {[day.city, day.summary].filter(Boolean).join(" / ")}
            </p>
          ) : null}
        </div>
      </div>

      {routePlan ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <ExternalNavLink href={routePlan.href} label={routePlan.label} inverse />
        </div>
      ) : null}

      {day?.items.length ? (
        <div className="mt-4 divide-y divide-primary/10 rounded-[1rem] border border-primary/10 bg-white/80">
          {day.items.map((item) => {
            const place = item.placeId ? placeById.get(item.placeId) : undefined;

            return (
              <div key={item.id} className="grid gap-1 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold leading-6">{item.title}</p>
                  <span className="text-xs font-semibold text-primary">
                    {item.startTime || "--:--"} - {item.endTime || "--:--"}
                  </span>
                </div>
                {place ? (
                  <p className="leading-6 text-muted-foreground">{place.name}</p>
                ) : null}
                {item.notes ? (
                  <p className="leading-6 text-muted-foreground">{item.notes}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : day ? (
        <div className="mt-4 rounded-lg border border-dashed border-primary/15 bg-white/70 px-3 py-4 text-sm leading-6 text-muted-foreground">
          当天还没有活动。
        </div>
      ) : null}
    </section>
  );
}

function MemberPill({ member }: { member: TripMember }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-sm shadow-[0_1px_2px_rgba(23,23,23,0.04)]">
      <UsersRound className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
      <span>{member.displayName}</span>
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          member.color === "teal" && "bg-teal",
          member.color === "coral" && "bg-coral",
          member.color === "sunset" && "bg-sunset",
          member.color === "leaf" && "bg-leaf"
        )}
      />
    </span>
  );
}

function ExternalNavLink({
  href,
  label,
  inverse
}: {
  href: string;
  label: string;
  inverse?: boolean;
}) {
  return (
    <a
      className={cn(
        "focus-ring inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
        inverse
          ? "border-primary/20 bg-white text-primary hover:bg-secondary"
          : "border-border bg-white text-foreground hover:border-primary/25 hover:bg-secondary/45 hover:text-primary"
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

function isConfirmedTrip(data: TripPhase1Data) {
  return (
    data.trip.phase === "final_confirmed" ||
    data.trip.phase === "travel_active" ||
    data.itineraryVersions.some((version) => version.status === "final")
  );
}

function getConfirmedVersion(data: TripPhase1Data) {
  return (
    data.itineraryVersions.find(
      (version) =>
        version.id === data.currentItineraryVersionId && version.status === "final"
    ) ??
    data.itineraryVersions.find((version) => version.status === "final") ??
    data.itineraryVersions.find((version) => version.id === data.currentItineraryVersionId)
  );
}

function compareTripsByNearestTime(left: TripPhase1Data, right: TripPhase1Data) {
  const now = new Date().getTime();
  const leftTime = new Date(`${left.trip.startDate}T00:00:00`).getTime();
  const rightTime = new Date(`${right.trip.startDate}T00:00:00`).getTime();
  const leftDelta = leftTime >= now ? leftTime - now : now - leftTime + 100000000000;
  const rightDelta = rightTime >= now ? rightTime - now : now - rightTime + 100000000000;

  return leftDelta - rightDelta;
}

function findNextVersionDay(
  version: ItineraryVersion,
  timezone: string
): ItineraryDay | undefined {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
  const nowTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone
  }).format(new Date());
  const sortedDays = [...version.days].sort((left, right) =>
    left.date.localeCompare(right.date)
  );

  for (const day of sortedDays) {
    if (day.date < today) {
      continue;
    }

    if (day.date === today && hasDayEnded(day, nowTime)) {
      continue;
    }

    return day;
  }

  return undefined;
}

function hasDayEnded(day: ItineraryDay, nowTime: string) {
  if (day.items.length === 0) {
    return false;
  }

  return day.items.every((item) => item.endTime && item.endTime < nowTime);
}
