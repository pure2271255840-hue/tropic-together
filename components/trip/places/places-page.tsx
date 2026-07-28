"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuthSession } from "@/features/auth/use-auth-session";
import {
  testAccountTripChangeEvent,
  type TestAccountTripChangeDetail
} from "@/components/trip/phase1/test-account-shortcut-events";
import {
  externalMapUrl,
  locationInputParts
} from "@/features/trip/navigation-links";
import {
  buildPlaceRankings,
  planPhaseLabels,
  placeInitialTagLabels,
  placeVoteLabels,
  type RankedPlace
} from "@/features/trip/trip-labels";
import type {
  PlaceInitialTag,
  PlaceInput,
  PlaceVoteValue,
  TripGroupSummary,
  TravelPlace,
  TripMember
} from "@/features/trip/types";
import {
  readCachedTripGroups,
  writeCachedTripGroups
} from "@/features/trip/trip-group-cache";
import { listTripGroups } from "@/features/trip/trip-storage";
import { useLocalTripStore } from "@/features/trip/use-local-trip-store";
import { cn } from "@/lib/utils";

type PlacesPageProps = {
  tripId: string;
};

type PlaceFilter = "pending" | "ranking";

type PlaceFormState = {
  name: string;
  city: string;
  category: string;
  customCategory: string;
  initialTag: PlaceInitialTag;
  address: string;
  mapUrl: string;
  location: string;
  notes: string;
  suggestedDuration: string;
  lat: string;
  lng: string;
};

const emptyForm: PlaceFormState = {
  name: "",
  city: "",
  category: "餐饮",
  customCategory: "",
  initialTag: "nice_to_have",
  address: "",
  mapUrl: "",
  location: "",
  notes: "",
  suggestedDuration: "",
  lat: "",
  lng: ""
};

const filters: Array<{ label: string; value: PlaceFilter }> = [
  { label: "待投票", value: "pending" },
  { label: "排名", value: "ranking" }
];

const customCategoryValue = "__custom__";
const placeCategoryOptions = ["餐饮", "酒吧", "购物", "景点"];

function isPresetCategory(category: string) {
  return placeCategoryOptions.includes(category);
}

function placeToForm(place: TravelPlace): PlaceFormState {
  return {
    name: place.name,
    city: place.city,
    category: isPresetCategory(place.category) ? place.category : customCategoryValue,
    customCategory: isPresetCategory(place.category) ? "" : place.category,
    initialTag: place.initialTag,
    address: place.address,
    mapUrl: place.mapUrl ?? "",
    location: place.address || place.mapUrl || "",
    notes: place.notes,
    suggestedDuration: place.suggestedDuration,
    lat: place.coordinate ? String(place.coordinate.lat) : "",
    lng: place.coordinate ? String(place.coordinate.lng) : ""
  };
}

function formToInput(form: PlaceFormState, fallbackCity: string): PlaceInput {
  const lat = form.lat.trim() ? Number(form.lat) : undefined;
  const lng = form.lng.trim() ? Number(form.lng) : undefined;
  const location = locationInputParts(form.location, form.address, form.mapUrl);
  const category =
    form.category === customCategoryValue
      ? form.customCategory.trim()
      : form.category;

  return {
    name: form.name,
    city: form.city.trim() || fallbackCity,
    category: category || placeCategoryOptions[0],
    initialTag: form.initialTag,
    address: location.address,
    mapUrl: location.mapUrl,
    notes: form.notes,
    suggestedDuration: form.suggestedDuration,
    lat,
    lng
  };
}

export function PlacesPage({ tripId }: PlacesPageProps) {
  const auth = useAuthSession();
  const [tripGroups, setTripGroups] = useState<TripGroupSummary[]>([]);
  const [isTripGroupsLoading, setIsTripGroupsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const workingTripId = selectedTripId ?? tripId;
  const { data, isLoaded, actions } = useLocalTripStore(workingTripId);
  const [filter, setFilter] = useState<PlaceFilter>("pending");
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [votingPlaceId, setVotingPlaceId] = useState<string | null>(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [form, setForm] = useState<PlaceFormState>(emptyForm);

  const currentMember =
    data.members.find((member) => member.id === data.currentMemberId) ??
    data.members[0];
  const rankings = useMemo(
    () => buildPlaceRankings(data.places, data.placeVotes),
    [data.placeVotes, data.places]
  );
  const pendingCount = rankings.filter(
    (ranking) =>
      !ranking.votes.some((vote) => vote.memberId === data.currentMemberId)
  ).length;
  const visibleRankings = rankings.filter((ranking) => {
    if (filter === "pending") {
      return !ranking.votes.some((vote) => vote.memberId === data.currentMemberId);
    }

    return true;
  });
  const votingRanking =
    votingPlaceId ? rankings.find((ranking) => ranking.place.id === votingPlaceId) : undefined;

  const refreshTripGroups = useCallback(async (showLoading = false) => {
    if (!auth.user) {
      setTripGroups([]);
      setIsTripGroupsLoading(false);
      return;
    }

    if (showLoading) {
      setIsTripGroupsLoading(true);
    }

    try {
      const groups = await listTripGroups(tripId);

      setTripGroups(groups);
      writeCachedTripGroups(auth.user.id, groups);
    } finally {
      setIsTripGroupsLoading(false);
    }
  }, [auth.user, tripId]);

  useEffect(() => {
    if (auth.isLoading && !auth.user) {
      setIsTripGroupsLoading(true);
      return;
    }

    if (!auth.user) {
      setTripGroups([]);
      setIsTripGroupsLoading(false);
      return;
    }

    const cachedGroups = readCachedTripGroups(auth.user.id);

    if (cachedGroups) {
      setTripGroups(cachedGroups);
      setIsTripGroupsLoading(false);
      void refreshTripGroups();
      return;
    }

    void refreshTripGroups(true);
  }, [auth.isLoading, auth.user, refreshTripGroups]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<TestAccountTripChangeDetail>(testAccountTripChangeEvent, {
        detail: { tripId: workingTripId }
      })
    );
  }, [workingTripId]);

  function updateForm<K extends keyof PlaceFormState>(
    key: K,
    value: PlaceFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAddPlace() {
    setEditingPlaceId(null);
    setForm(emptyForm);
    setShowPlaceModal(true);
  }

  function startEditing(place: TravelPlace) {
    setEditingPlaceId(place.id);
    setForm(placeToForm(place));
    setShowPlaceModal(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      (form.category === customCategoryValue && !form.customCategory.trim())
    ) {
      return;
    }

    const input = formToInput(form, data.trip.destinations[0] ?? "");

    if (editingPlaceId) {
      actions.updatePlace(editingPlaceId, input);
    } else {
      actions.addPlace(input);
      setFilter("pending");
    }

    setEditingPlaceId(null);
    setForm(emptyForm);
    setShowPlaceModal(false);
  }

  if (!selectedTripId) {
    return (
      <main className="page-shell">
        <section className="space-y-3">
          <div>
            <p className="page-kicker">
              先选择行程
            </p>
            <h1 className="page-title">地点</h1>
          </div>
        </section>

        <section className="grid gap-3">
          {isTripGroupsLoading ? (
            <div className="surface-card text-sm text-muted-foreground">
              正在读取行程
            </div>
          ) : null}
          {!isTripGroupsLoading
            ? tripGroups.map((group) => (
                <TripGroupPlaceCard
                  key={group.id}
                  group={group}
                  onOpen={() => setSelectedTripId(group.id)}
                />
              ))
            : null}
          {!isTripGroupsLoading && tripGroups.length === 0 ? (
            <div className="surface-card-muted text-center">
              <p className="text-base font-semibold">还没有行程数据</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                请先到行程页发起新行程，再进入地点池。
              </p>
              <Link
                className="focus-ring mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_rgba(242,99,76,0.22)] transition hover:bg-primary/90"
                href={`/trip/${tripId}/itinerary`}
              >
                去行程页
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main className="page-shell">
        <section className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTripId(null);
              void refreshTripGroups();
            }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回行程
          </Button>
          <div className="surface-card text-sm text-muted-foreground">
            正在读取行程
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedTripId(null);
            void refreshTripGroups();
          }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回行程
        </Button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="page-kicker">
              {data.trip.name}
            </p>
            <h1 className="page-title">地点池</h1>
          </div>
          <Badge tone={pendingCount > 0 ? "sunset" : "teal"} className="shrink-0">
            {pendingCount} 待投票
          </Badge>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <Button type="button" className="w-full" onClick={openAddPlace}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          添加地点
        </Button>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-[1.125rem] border border-border bg-muted/55 p-1">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                "focus-ring h-10 rounded-lg px-3 text-sm font-medium transition",
                filter === item.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-white hover:text-primary"
              )}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {visibleRankings.map((ranking) => (
            <PlaceCard
              key={`${ranking.place.id}-${currentMember.id}`}
              ranking={ranking}
              members={data.members}
              currentMember={currentMember}
              onEdit={() => startEditing(ranking.place)}
              onDelete={() => {
                if (window.confirm(`删除地点「${ranking.place.name}」？`)) {
                  actions.deletePlace(ranking.place.id);
                }
              }}
              onVote={() => setVotingPlaceId(ranking.place.id)}
            />
          ))}
        </div>

        {visibleRankings.length === 0 ? (
          <div className="surface-card-muted text-center text-sm text-muted-foreground">
            {filter === "pending" ? "当前没有待投票地点。" : "当前没有地点。"}
          </div>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        {isLoaded
          ? `${data.places.length - pendingCount}/${data.places.length} 已投`
          : "正在读取本地数据"}
      </p>

      <Modal
        open={showPlaceModal}
        title={editingPlaceId ? "编辑地点" : "添加地点"}
        description="先选地点类型，再选你对它的初始感觉。"
        onClose={() => {
          setEditingPlaceId(null);
          setForm(emptyForm);
          setShowPlaceModal(false);
        }}
      >
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <input
            className="field-control"
            placeholder="地点名"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
          />
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">地点标签</legend>
            <div className="flex flex-wrap gap-2">
              {placeCategoryOptions.map((category) => (
                <TagButton
                  key={category}
                  active={form.category === category}
                  label={category}
                  onClick={() => {
                    updateForm("category", category);
                    updateForm("customCategory", "");
                  }}
                />
              ))}
              <TagButton
                active={form.category === customCategoryValue}
                label="自定义"
                onClick={() => updateForm("category", customCategoryValue)}
              />
            </div>
            {form.category === customCategoryValue ? (
              <input
                className="field-control"
                placeholder="手打标签名称"
                value={form.customCategory}
                onChange={(event) =>
                  updateForm("customCategory", event.target.value)
                }
              />
            ) : null}
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">初始感觉</legend>
            <div className="grid grid-cols-2 gap-2">
              <OpinionTagButton
                active={form.initialTag === "must_go"}
                label="一定要去"
                onClick={() => updateForm("initialTag", "must_go")}
              />
              <OpinionTagButton
                active={form.initialTag === "nice_to_have"}
                label="还不错"
                onClick={() => updateForm("initialTag", "nice_to_have")}
              />
            </div>
          </fieldset>
          <input
            className="field-control"
            placeholder="预计停留时间"
            value={form.suggestedDuration}
            onChange={(event) => updateForm("suggestedDuration", event.target.value)}
          />
          <input
            className="field-control"
            placeholder="地址或地图链接"
            value={form.location}
            onChange={(event) => updateForm("location", event.target.value)}
          />
          <textarea
            className="field-area min-h-20"
            placeholder="地点备注"
            value={form.notes}
            onChange={(event) => updateForm("notes", event.target.value)}
          />
          <Button
            type="submit"
            disabled={
              !form.name.trim() ||
              (form.category === customCategoryValue && !form.customCategory.trim())
            }
          >
            {editingPlaceId ? "保存地点" : "添加地点"}
          </Button>
        </form>
      </Modal>

      {votingRanking ? (
        <PlaceVoteModal
          key={`${votingRanking.place.id}-${currentMember.id}`}
          ranking={votingRanking}
          members={data.members}
          currentMember={currentMember}
          onClose={() => setVotingPlaceId(null)}
          onVote={(value, reason) => {
            actions.setPlaceVote(
              votingRanking.place.id,
              currentMember.id,
              value,
              reason
            );
            setVotingPlaceId(null);
          }}
        />
      ) : null}
    </main>
  );
}

function TripGroupPlaceCard({
  group,
  onOpen
}: {
  group: TripGroupSummary;
  onOpen: () => void;
}) {
  return (
    <article className="corner-mark surface-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">{group.name}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {group.startDate} 至 {group.endDate}
          </p>
        </div>
        <Badge tone="teal" className="shrink-0">
          {planPhaseLabels[group.phase]}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <SmallStat label="地点" value={`${group.placeCount}`} />
        <SmallStat label="成员" value={`${group.members?.length ?? 0}`} />
      </div>
      <MemberList members={group.members ?? []} />
      <Button type="button" className="mt-4 w-full" onClick={onOpen}>
        进入地点池
      </Button>
    </article>
  );
}

function PlaceCard({
  ranking,
  members,
  currentMember,
  onEdit,
  onDelete,
  onVote
}: {
  ranking: RankedPlace;
  members: TripMember[];
  currentMember: TripMember;
  onEdit: () => void;
  onDelete: () => void;
  onVote: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { place, votes } = ranking;
  const currentVote = votes.find((vote) => vote.memberId === currentMember.id);
  const addedBy = memberName(members, place.addedByMemberId);
  const ownerOpinion = `${addedBy} 觉得${placeInitialTagLabels[place.initialTag]}`;
  const locationLabel = place.address || (place.mapUrl ? "查看地图位置" : "");
  const placeMeta = placeMetaText(place);

  return (
    <article className="surface-card relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-secondary text-sm font-semibold text-primary">
            {ranking.rank}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug">{place.name}</h2>
            {placeMeta ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {placeMeta}
              </p>
            ) : null}
          </div>
        </div>
        <div className="relative flex shrink-0 items-start gap-2">
          <Badge
            tone={place.initialTag === "must_go" ? "teal" : "outline"}
            className="max-w-[9rem] justify-center text-center leading-4"
          >
            {ownerOpinion}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="地点操作"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
          {isMenuOpen ? (
            <div className="absolute right-0 top-10 z-20 w-32 rounded-[1rem] border border-border bg-white p-1 shadow-lift">
              <button
                type="button"
                className="focus-ring flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-secondary/60 hover:text-primary"
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                编辑
              </button>
              <button
                type="button"
                className="focus-ring flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-coral hover:bg-secondary/60"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                删除
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6">
        {locationLabel ? (
          <a
            className="focus-ring flex gap-2 rounded-lg text-muted-foreground transition hover:text-primary"
            href={externalMapUrl(place)}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
            <span>{locationLabel}</span>
          </a>
        ) : null}
        {place.notes ? <p className="text-muted-foreground">{place.notes}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Badge tone="outline">
            <ThumbsUp className="mr-1 h-3 w-3 text-teal" aria-hidden="true" />
            {placeVoteLabels.up} {ranking.upCount}
          </Badge>
          <Badge tone="outline">
            <ThumbsDown className="mr-1 h-3 w-3 text-coral" aria-hidden="true" />
            {placeVoteLabels.down} {ranking.downCount}
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <Button type="button" className="w-full sm:w-auto" onClick={onVote}>
          {currentVote ? "修改投票" : "投票"}
        </Button>
      </div>
    </article>
  );
}

function PlaceVoteModal({
  ranking,
  members,
  currentMember,
  onClose,
  onVote
}: {
  ranking: RankedPlace;
  members: TripMember[];
  currentMember: TripMember;
  onClose: () => void;
  onVote: (value: PlaceVoteValue, reason: string) => void;
}) {
  const currentVote = ranking.votes.find(
    (vote) => vote.memberId === currentMember.id
  );
  const [selectedVote, setSelectedVote] = useState<PlaceVoteValue | null>(
    currentVote?.value ?? null
  );
  const [reason, setReason] = useState(currentVote?.reason ?? "");

  return (
    <Modal
      open
      title="地点投票"
      description={ranking.place.name}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={selectedVote === "up" ? "quiet" : "outline"}
            onClick={() => setSelectedVote("up")}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            {placeVoteLabels.up} {ranking.upCount}
          </Button>
          <Button
            type="button"
            variant={selectedVote === "down" ? "quiet" : "outline"}
            onClick={() => setSelectedVote("down")}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            {placeVoteLabels.down} {ranking.downCount}
          </Button>
        </div>
        <textarea
          className="field-area w-full"
          placeholder="投票原因"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button
          type="button"
          className="w-full"
          disabled={!selectedVote}
          onClick={() => selectedVote && onVote(selectedVote, reason)}
        >
          保存投票
        </Button>

        {ranking.votes.length > 0 ? (
          <div className="divide-y divide-border">
            {ranking.votes.map((vote) => (
              <div key={vote.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{memberName(members, vote.memberId)}</p>
                  <Badge tone={vote.value === "up" ? "teal" : "sunset"}>
                    {placeVoteLabels[vote.value]}
                  </Badge>
                </div>
                {vote.reason ? (
                  <p className="mt-1 leading-6 text-muted-foreground">
                    {vote.reason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function TagButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring h-11 rounded-lg border px-3 text-sm font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-foreground hover:border-primary/25 hover:bg-secondary/45 hover:text-primary"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function OpinionTagButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring min-h-11 rounded-full border px-4 text-sm font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(242,99,76,0.16)]"
          : "border-border bg-white text-muted-foreground hover:border-primary/25 hover:bg-secondary/45 hover:text-primary"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/55 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MemberList({ members }: { members: TripMember[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {members.map((member) => (
        <span
          key={member.id}
          className="rounded-lg border border-border bg-muted/45 px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          {member.displayName}
        </span>
      ))}
    </div>
  );
}

function memberName(members: TripMember[], memberId: string) {
  return members.find((member) => member.id === memberId)?.displayName ?? "成员";
}

function placeMetaText(place: TravelPlace) {
  return [place.city, place.category, place.suggestedDuration]
    .filter(Boolean)
    .join(" / ");
}
