"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Globe2,
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
import { useTripDataStore } from "@/features/trip/trip-data-provider";
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

type HomeReminder = {
  eyebrow: string;
  title: string;
  description: string;
  day?: ItineraryDay;
};

const homeTimezoneStorageKey = "tropic-together.home.timezone";
const fallbackTimezone = "UTC";
const commonTimezones = [
  "Asia/Shanghai",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Asia/Bangkok",
  "Australia/Sydney",
  "Europe/London",
  "America/Los_Angeles",
  "America/New_York",
  "UTC"
];

export function TripHomePage({ tripId }: TripHomePageProps) {
  const auth = useAuthSession();
  const sharedTripStore = useTripDataStore();
  const [confirmedTrips, setConfirmedTrips] = useState<TripPhase1Data[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [detectedTimezone, setDetectedTimezone] = useState("UTC");
  const [selectedTimezone, setSelectedTimezone] = useState("UTC");
  const [isTimezoneMenuOpen, setIsTimezoneMenuOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function applyConfirmedTripGroups(
      groups: Awaited<ReturnType<typeof listTripGroups>>
    ) {
      const trips = await Promise.all(groups.map((group) => loadTripData(group.id)));
      const nextConfirmedTrips = trips.filter(isConfirmedTrip);

      if (!isCancelled) {
        setConfirmedTrips(nextConfirmedTrips);
        setIsLoadingTrips(false);
      }
    }

    async function loadConfirmedTrip() {
      if (!auth.user) {
        setConfirmedTrips([]);
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

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    const timer = window.setInterval(updateNow, 30000);

    updateNow();

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const browserTimezone = detectBrowserTimezone();
    const savedTimezone = window.localStorage.getItem(homeTimezoneStorageKey);
    const nextTimezone =
      savedTimezone && isValidTimezone(savedTimezone)
        ? savedTimezone
        : browserTimezone;

    setDetectedTimezone(browserTimezone);
    setSelectedTimezone(nextTimezone);
  }, []);

  function chooseTimezone(timezone: string) {
    setSelectedTimezone(timezone);
    window.localStorage.setItem(homeTimezoneStorageKey, timezone);
    setIsTimezoneMenuOpen(false);
  }

  const timezoneOptions = useMemo(
    () =>
      timezoneOptionsFor({
        selectedTimezone,
        detectedTimezone,
        trips: confirmedTrips
      }),
    [confirmedTrips, detectedTimezone, selectedTimezone]
  );
  const effectiveConfirmedTrips = useMemo(() => {
    const tripsById = new Map(confirmedTrips.map((data) => [data.trip.id, data]));

    if (sharedTripStore.isLoaded && isConfirmedTrip(sharedTripStore.data)) {
      tripsById.set(sharedTripStore.data.trip.id, sharedTripStore.data);
    }

    return Array.from(tripsById.values());
  }, [confirmedTrips, sharedTripStore.data, sharedTripStore.isLoaded]);
  const canShowSharedTrip =
    sharedTripStore.isLoaded && isConfirmedTrip(sharedTripStore.data);
  const showLoadingTrips = isLoadingTrips && !canShowSharedTrip;
  const reminderTrip = useMemo(
    () => selectReminderTrip(effectiveConfirmedTrips, selectedTimezone, now),
    [effectiveConfirmedTrips, now, selectedTimezone]
  );
  const confirmedVersion = reminderTrip
    ? getConfirmedVersion(reminderTrip)
    : undefined;
  const reminder =
    reminderTrip && confirmedVersion
      ? buildHomeReminder(reminderTrip, confirmedVersion, selectedTimezone, now)
      : null;
  const confirmedPlaceById = useMemo(
    () => new Map(reminderTrip?.places.map((place) => [place.id, place]) ?? []),
    [reminderTrip]
  );
  const reminderRoutePlan =
    reminderTrip && reminder?.day
      ? routePlanForItineraryDay(
          reminder.day,
          confirmedPlaceById,
          reminderTrip.trip.hotelAddress,
          reminderTrip.trip.hotelMapUrl
        )
      : null;

  return (
    <main className="page-shell">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="page-kicker">
              今日行程
            </p>
            <h1 className="page-title">首页</h1>
          </div>
          <TimezoneSelector
            selectedTimezone={selectedTimezone}
            detectedTimezone={detectedTimezone}
            options={timezoneOptions}
            isOpen={isTimezoneMenuOpen}
            onToggle={() => setIsTimezoneMenuOpen((current) => !current)}
            onSelect={chooseTimezone}
          />
        </div>
      </section>

      {showLoadingTrips ? (
        <HomeLoadingState />
      ) : reminderTrip ? (
        <section className="corner-mark surface-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                最近已确认行程
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-foreground">
                {reminderTrip.trip.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {reminderTrip.trip.startDate} 至 {reminderTrip.trip.endDate}
              </p>
            </div>
            <Badge tone="teal" className="shrink-0">
              {planPhaseLabels[reminderTrip.trip.phase]}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium transition hover:border-primary/25 hover:bg-secondary/45 hover:text-primary"
              href={`/trip/${reminderTrip.trip.id}/itinerary?open=detail`}
            >
              <Route className="h-4 w-4" aria-hidden="true" />
              打开行程
            </Link>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {reminderTrip.members.map((member) => (
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

      {!showLoadingTrips && reminderTrip && reminder ? (
        <ItineraryReminderCard
          reminder={reminder}
          placeById={confirmedPlaceById}
          routePlan={reminderRoutePlan}
          timezone={selectedTimezone}
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

function ItineraryReminderCard({
  reminder,
  placeById,
  routePlan,
  timezone
}: {
  reminder: HomeReminder;
  placeById: Map<string, TravelPlace>;
  routePlan: ItineraryRoutePlan | null;
  timezone: string;
}) {
  const day = reminder.day;

  return (
    <section className="corner-mark rounded-[1.25rem] border border-primary/15 bg-secondary/70 p-5 text-foreground shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{reminder.eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight">
            {reminder.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {reminder.description}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            当前时区：{timezone}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary">
          <Navigation className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {routePlan ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-lg border border-primary/20 bg-white px-3 text-sm font-medium text-primary">
            {routePlan.label}
          </span>
          <RoutePlanLinks routePlan={routePlan} inverse />
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

function TimezoneSelector({
  selectedTimezone,
  detectedTimezone,
  options,
  isOpen,
  onToggle,
  onSelect
}: {
  selectedTimezone: string;
  detectedTimezone: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (timezone: string) => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="focus-ring inline-flex h-10 max-w-[52vw] items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground shadow-[0_1px_2px_rgba(23,23,23,0.04)] transition hover:border-primary/25 hover:bg-secondary/45 hover:text-primary"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{selectedTimezone}</span>
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-[1rem] border border-border bg-white p-1 shadow-lift">
          <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
            默认使用系统时区；也可以手动切换。
          </p>
          <div className="max-h-72 overflow-y-auto">
            {options.map((timezone) => (
              <button
                key={timezone}
                type="button"
                className="focus-ring flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-secondary/60 hover:text-primary"
                onClick={() => onSelect(timezone)}
              >
                <span className="min-w-0">
                  <span className="block truncate">{timezone}</span>
                  {timezone === detectedTimezone ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      系统时区
                    </span>
                  ) : null}
                </span>
                {timezone === selectedTimezone ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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

function RoutePlanLinks({
  routePlan,
  inverse
}: {
  routePlan: ItineraryRoutePlan;
  inverse?: boolean;
}) {
  return (
    <>
      <ExternalNavLink
        href={routePlan.appleHref}
        label={routePlan.appleLegs.length > 1 ? "Apple 多站" : "Apple"}
        inverse={inverse}
      />
      <ExternalNavLink href={routePlan.href} label="Google" inverse={inverse} />
      {routePlan.appleLegs.length > 1 ? (
        <div className="flex basis-full flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>Apple 逐段</span>
          {routePlan.appleLegs.map((leg, index) => (
            <ExternalNavLink
              key={`${leg.href}-${index}`}
              href={leg.href}
              label={`第${index + 1}段`}
              title={`${leg.originName} -> ${leg.destinationName}`}
              inverse={inverse}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function ExternalNavLink({
  href,
  label,
  inverse,
  title
}: {
  href: string;
  label: string;
  inverse?: boolean;
  title?: string;
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
      title={title}
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

function selectReminderTrip(
  trips: TripPhase1Data[],
  timezone: string,
  now: Date
): TripPhase1Data | null {
  const { date: today } = currentDateTimeInTimezone(timezone, now);
  const activeTrips = trips
    .filter((data) => data.trip.startDate <= today && data.trip.endDate >= today)
    .sort((left, right) => left.trip.startDate.localeCompare(right.trip.startDate));

  if (activeTrips.length > 0) {
    return activeTrips[0];
  }

  const upcomingTrips = trips
    .filter((data) => data.trip.startDate >= today)
    .sort((left, right) => left.trip.startDate.localeCompare(right.trip.startDate));

  if (upcomingTrips.length > 0) {
    return upcomingTrips[0];
  }

  return (
    [...trips].sort((left, right) =>
      right.trip.endDate.localeCompare(left.trip.endDate)
    )[0] ?? null
  );
}

function buildHomeReminder(
  data: TripPhase1Data,
  version: ItineraryVersion,
  timezone: string,
  now: Date
): HomeReminder {
  const { date: today, time: nowTime } = currentDateTimeInTimezone(
    timezone,
    now
  );
  const sortedDays = [...version.days].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const firstDay = sortedDays[0];
  const lastDay = sortedDays[sortedDays.length - 1];
  const todayDay = sortedDays.find((day) => day.date === today);
  const nextDay = sortedDays.find((day) => day.date >= today);

  if (today < data.trip.startDate) {
    const day = nextDay ?? firstDay;

    return {
      eyebrow: "即将开始",
      title: day
        ? `${formatDateLabel(day.date)} / ${day.title}`
        : `${formatDateLabel(data.trip.startDate)} 开始`,
      description: day
        ? dayDescription(day)
        : `${data.trip.name} 将在 ${data.trip.startDate} 开始。`,
      day
    };
  }

  if (today > data.trip.endDate) {
    return {
      eyebrow: "最近已完成",
      title: lastDay
        ? `${formatDateLabel(lastDay.date)} / ${lastDay.title}`
        : "行程已结束",
      description: lastDay
        ? dayDescription(lastDay, "这是最近一段已确认行程。")
        : `${data.trip.name} 已在 ${data.trip.endDate} 结束。`,
      day: lastDay
    };
  }

  if (todayDay) {
    const firstStartTime = firstScheduledStartTime(todayDay);
    const isBeforeFirstActivity =
      Boolean(firstStartTime) && nowTime < firstStartTime;
    const activityText = activityReminderText(todayDay, nowTime);

    return {
      eyebrow: isBeforeFirstActivity ? "即将开始" : "今日执行",
      title: `${formatDateLabel(todayDay.date)} / ${todayDay.title}`,
      description: dayDescription(todayDay, activityText),
      day: todayDay
    };
  }

  if (nextDay) {
    return {
      eyebrow: "即将开始",
      title: `${formatDateLabel(nextDay.date)} / ${nextDay.title}`,
      description: dayDescription(nextDay, "今天没有排活动，下一段行程还未开始。"),
      day: nextDay
    };
  }

  return {
    eyebrow: "今日行程",
    title: "今天没有行程安排",
    description: `${data.trip.name} 暂无匹配今天日期的活动。`
  };
}

function currentDateTimeInTimezone(timezone: string, now: Date) {
  const safeTimezone = isValidTimezone(timezone) ? timezone : fallbackTimezone;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const valueFor = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`,
    time: `${valueFor("hour")}:${valueFor("minute")}`
  };
}

function detectBrowserTimezone() {
  if (typeof Intl === "undefined") {
    return fallbackTimezone;
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return timezone && isValidTimezone(timezone) ? timezone : fallbackTimezone;
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function timezoneOptionsFor({
  selectedTimezone,
  detectedTimezone,
  trips
}: {
  selectedTimezone: string;
  detectedTimezone: string;
  trips: TripPhase1Data[];
}) {
  const tripTimezones = trips.map((data) => data.trip.timezone).filter(Boolean);

  return Array.from(
    new Set([
      selectedTimezone,
      detectedTimezone,
      ...tripTimezones,
      ...commonTimezones
    ])
  ).filter(isValidTimezone);
}

function dayDescription(day: ItineraryDay, leadText?: string) {
  const dayText = [day.city, day.summary].filter(Boolean).join(" / ");

  return [leadText, dayText].filter(Boolean).join(" / ") || "当天还没有活动安排。";
}

function firstScheduledStartTime(day: ItineraryDay) {
  return [...day.items]
    .map((item) => item.startTime)
    .filter(isValidClockTime)
    .sort()[0];
}

function activityReminderText(day: ItineraryDay, nowTime: string) {
  if (day.items.length === 0) {
    return "今天还没有活动安排。";
  }

  const nowMinutes = clockTimeToMinutes(nowTime);
  const sortedItems = [...day.items].sort((left, right) =>
    (left.startTime || "99:99").localeCompare(right.startTime || "99:99")
  );
  const activeItem = sortedItems.find((item) => {
    const start = clockTimeToMinutes(item.startTime);
    const end = clockTimeToMinutes(item.endTime);

    return (
      start !== undefined &&
      end !== undefined &&
      nowMinutes !== undefined &&
      start <= nowMinutes &&
      nowMinutes < end
    );
  });

  if (activeItem) {
    return `正在进行：${activeItem.title}`;
  }

  const nextItem = sortedItems.find((item) => {
    const start = clockTimeToMinutes(item.startTime);

    return start !== undefined && nowMinutes !== undefined && start > nowMinutes;
  });

  if (nextItem) {
    return `下一项 ${nextItem.startTime}：${nextItem.title}`;
  }

  const timedItems = sortedItems.filter(
    (item) => clockTimeToMinutes(item.endTime) !== undefined
  );
  const hasOnlyEndedTimedItems =
    timedItems.length > 0 &&
    nowMinutes !== undefined &&
    timedItems.every((item) => {
      const end = clockTimeToMinutes(item.endTime);

      return end !== undefined && end <= nowMinutes;
    });

  if (hasOnlyEndedTimedItems) {
    return "今天的活动已完成。";
  }

  return `今日活动 ${day.items.length} 项。`;
}

function isValidClockTime(value: string) {
  return clockTimeToMinutes(value) !== undefined;
}

function clockTimeToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  return hours * 60 + minutes;
}
