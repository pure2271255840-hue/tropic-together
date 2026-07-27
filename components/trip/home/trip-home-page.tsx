"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Navigation,
  Route,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthSession } from "@/features/auth/use-auth-session";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl
} from "@/features/trip/navigation-links";
import {
  readCachedTripGroups,
  writeCachedTripGroups
} from "@/features/trip/trip-group-cache";
import { listTripGroups, loadTripData } from "@/features/trip/trip-storage";
import { formatDateLabel, planPhaseLabels } from "@/features/trip/trip-labels";
import type {
  ItineraryItem,
  ItineraryVersion,
  TravelPlace,
  TripMember,
  TripPhase1Data
} from "@/features/trip/types";
import { cn } from "@/lib/utils";

type TripHomePageProps = {
  tripId: string;
};

type HomeItineraryItem = {
  dayDate: string;
  item: ItineraryItem;
  place?: TravelPlace;
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
  const nextPlan =
    confirmedTrip && confirmedVersion
      ? findNextVersionItem(
          confirmedVersion,
          confirmedTrip.places,
          confirmedTrip.trip.timezone
        )
      : undefined;

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
        <section className="surface-card text-sm text-muted-foreground">
          正在读取行程
        </section>
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
            首页只展示已确认且时间最近的行程。去行程页确认最终版后，这里会显示它的下一段活动。
          </p>
          <Link
            className="focus-ring mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_rgba(242,99,76,0.22)] transition hover:bg-primary/90"
            href={`/trip/${tripId}/itinerary`}
          >
            去行程页
          </Link>
        </section>
      )}

      <section className="corner-mark rounded-[1.25rem] border border-primary/15 bg-secondary/70 p-5 text-foreground shadow-soft">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary">
            <Navigation className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">下一个即将执行的行程</p>
            <h2 className="mt-1 text-lg font-semibold">
              {nextPlan?.item.title ?? "暂无下一段行程"}
            </h2>
            {nextPlan ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {formatDateLabel(nextPlan.dayDate)} {nextPlan.item.startTime || "--:--"} - {nextPlan.item.endTime || "--:--"}
                {nextPlan.place ? ` / ${nextPlan.place.name}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        {nextPlan?.place ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <ExternalNavLink
              href={appleMapsDirectionsUrl(nextPlan.place)}
              label="Apple 导航"
              inverse
            />
            <ExternalNavLink
              href={googleMapsDirectionsUrl(nextPlan.place)}
              label="Google 导航"
              inverse
            />
          </div>
        ) : null}
      </section>

    </main>
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

function findNextVersionItem(
  version: ItineraryVersion,
  places: TravelPlace[],
  timezone: string
): HomeItineraryItem | undefined {
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

    const item =
      day.date === today
        ? day.items.find((candidate) => candidate.startTime >= nowTime)
        : day.items[0];

    if (item) {
      return {
        dayDate: day.date,
        item,
        place: item.placeId
          ? places.find((place) => place.id === item.placeId)
          : undefined
      };
    }
  }

  const firstItem = sortedDays.flatMap((day) =>
    day.items.map((item) => ({ dayDate: day.date, item }))
  )[0];

  if (!firstItem) {
    return undefined;
  }

  return {
    ...firstItem,
    place: firstItem.item.placeId
      ? places.find((place) => place.id === firstItem.item.placeId)
      : undefined
  };
}
