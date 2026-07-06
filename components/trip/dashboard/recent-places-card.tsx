import { MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { PlaceIdea } from "@/features/dashboard/types";

type RecentPlacesCardProps = {
  places: PlaceIdea[];
};

export function RecentPlacesCard({ places }: RecentPlacesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">大家最近加入</p>
            <CardTitle className="mt-2 text-xl">地点灵感</CardTitle>
          </div>
          <Badge tone="teal">{places.length} 个地点</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {places.length > 0 ? (
          <div className="grid gap-3">
            {places.map((place) => (
              <PlaceRow key={place.id} place={place} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
            title="还没有收藏地点"
            description="把餐厅、景点、咖啡店先加进来，之后大家可以一起投票、排路线。"
          />
        )}
      </CardContent>
    </Card>
  );
}

function PlaceRow({ place }: { place: PlaceIdea }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-5">{place.name}</h3>
            <Badge tone={place.status === "备选" ? "outline" : "sunset"}>
              {place.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {place.city} · {place.category} · {place.suggestedTime}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="teal">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              {place.voteSummary}
            </Badge>
            <Badge tone="outline">由 {place.addedBy.name} 添加</Badge>
          </div>
        </div>
      </div>
    </article>
  );
}
