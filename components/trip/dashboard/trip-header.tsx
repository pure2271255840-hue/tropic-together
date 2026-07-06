import { CalendarDays, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TripSummary } from "@/features/dashboard/types";

type Countdown = {
  eyebrow: string;
  value: string;
  unit: string;
  description: string;
};

type TripHeaderProps = {
  trip: TripSummary;
  countdown: Countdown;
};

export function TripHeader({ trip, countdown }: TripHeaderProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal">私人旅行协作</Badge>
            <Badge tone="outline">{trip.timezone}</Badge>
          </div>
          <div className="mt-5 max-w-2xl space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {trip.subtitle}
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {trip.name}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-coral" aria-hidden="true" />
              <span>{trip.dateRange}</span>
            </p>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {trip.destinations.map((destination) => (
              <div
                key={destination.city}
                className="rounded-lg border border-border bg-background/70 p-3"
              >
                <Badge tone={destination.tone}>{destination.city}</Badge>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {destination.mood}
                </p>
              </div>
            ))}
          </div>
        </div>

      <div className="rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-soft">
          <div className="flex h-full flex-col justify-between p-5">
            <div>
              <p className="flex items-center gap-2 text-sm opacity-90">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {countdown.eyebrow}
              </p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-semibold leading-none">
                  {countdown.value}
                </span>
                {countdown.unit ? (
                  <span className="pb-1 text-lg font-medium">{countdown.unit}</span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 opacity-90">
                {countdown.description}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>{trip.members.length} 位成员正在一起整理行程</span>
            </div>
          </div>
      </div>
    </section>
  );
}
