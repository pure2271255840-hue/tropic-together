"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Route,
  RotateCcw,
  Settings2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  testAccountTripChangeEvent,
  type TestAccountTripChangeDetail
} from "@/components/trip/phase1/test-account-shortcut-events";
import { useAuthSession } from "@/features/auth/use-auth-session";
import type { AuthUser } from "@/features/auth/types";
import { setActiveTripMemberId } from "@/features/trip/active-member";
import {
  appleMapsDirectionsUrl,
  externalMapUrl,
  googleMapsDirectionsUrl,
  googleMapsRouteUrl,
  locationInputParts,
  type MapDestination
} from "@/features/trip/navigation-links";
import {
  deleteTripData,
  importSeedTripData,
  listTripGroups,
  saveTripData
} from "@/features/trip/trip-storage";
import { createSeedTripData } from "@/features/trip/seed-data";
import { createInviteCode, invitePath } from "@/features/trip/invite-code";
import {
  buildPlaceRankings,
  formatDateLabel,
  itinerarySourceLabels,
  itineraryVersionStatusLabels,
  itineraryVoteLabels,
  placeVoteLabels,
  planPhaseLabels,
  type RankedPlace
} from "@/features/trip/trip-labels";
import type {
  ItineraryDay,
  ItineraryDayInput,
  ItineraryItem,
  ItineraryItemInput,
  ItineraryVersion,
  ItineraryVoteValue,
  TravelPlace,
  TripGroupSummary,
  TripMember
} from "@/features/trip/types";
import { useLocalTripStore } from "@/features/trip/use-local-trip-store";
import { cn } from "@/lib/utils";

type ItineraryPageProps = {
  tripId: string;
};

type ItemFormState = {
  dayId: string;
  title: string;
  placeId: string;
  startTime: string;
  endTime: string;
  notes: string;
  isLocked: boolean;
};

type NewTripForm = {
  name: string;
  startDate: string;
  endDate: string;
  hotelLocation: string;
};

type TripSettingsForm = {
  name: string;
  startDate: string;
  endDate: string;
  hotelLocation: string;
};

function defaultItemForm(dayId: string): ItemFormState {
  return {
    dayId,
    title: "",
    placeId: "",
    startTime: "",
    endTime: "",
    notes: "",
    isLocked: false
  };
}

export function ItineraryPage({ tripId }: ItineraryPageProps) {
  const auth = useAuthSession();
  const [tripGroups, setTripGroups] = useState<TripGroupSummary[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [managedDayId, setManagedDayId] = useState<string | null>(null);
  const [showManageItineraryModal, setShowManageItineraryModal] = useState(false);
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showTripSettingsModal, setShowTripSettingsModal] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<"generate" | "organize" | null>(
    null
  );
  const [voteIntent, setVoteIntent] = useState<ItineraryVoteValue | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [newTripForm, setNewTripForm] = useState<NewTripForm>({
    name: "",
    startDate: "",
    endDate: "",
    hotelLocation: ""
  });
  const [tripSettingsForm, setTripSettingsForm] = useState<TripSettingsForm>({
    name: "",
    startDate: "",
    endDate: "",
    hotelLocation: ""
  });
  const workingTripId = selectedTripId ?? tripId;
  const { data, actions } = useLocalTripStore(workingTripId);
  const currentMember =
    data.members.find((member) => member.id === data.currentMemberId) ??
    data.members[0];
  const isOwner = currentMember?.role === "owner";
  const placeById = useMemo(
    () => new Map(data.places.map((place) => [place.id, place])),
    [data.places]
  );
  const placeRankings = useMemo(
    () => buildPlaceRankings(data.places, data.placeVotes),
    [data.places, data.placeVotes]
  );
  const currentVersion = getCurrentVersion(data.itineraryVersions, data.currentItineraryVersionId);
  const activeVersion = selectedTripId && currentVersion ? currentVersion : null;
  const firstDayId = activeVersion?.days[0]?.id ?? "";
  const [itemForm, setItemForm] = useState<ItemFormState>(() =>
    defaultItemForm(firstDayId)
  );
  const selectedDayId =
    activeVersion?.days.some((day) => day.id === itemForm.dayId)
      ? itemForm.dayId
      : firstDayId;
  const managedDay =
    activeVersion && managedDayId
      ? activeVersion.days.find((day) => day.id === managedDayId) ?? null
      : null;
  const usedPlaceIdsByOtherItems = useMemo<Record<string, boolean>>(() => {
    const usedPlaceIds: Record<string, boolean> = {};

    if (!activeVersion) {
      return usedPlaceIds;
    }

    for (const day of activeVersion.days) {
      for (const item of day.items) {
        if (item.placeId && item.id !== editingItem?.id) {
          usedPlaceIds[item.placeId] = true;
        }
      }
    }

    return usedPlaceIds;
  }, [activeVersion, editingItem?.id]);
  const availablePlaceRankings = useMemo(
    () =>
      placeRankings.filter(
        (ranking) =>
          !usedPlaceIdsByOtherItems[ranking.place.id] ||
          ranking.place.id === itemForm.placeId
      ),
    [itemForm.placeId, placeRankings, usedPlaceIdsByOtherItems]
  );

  const refreshTripGroups = useCallback(async () => {
    setTripGroups(await listTripGroups(tripId));
  }, [tripId]);

  useEffect(() => {
    void refreshTripGroups();
  }, [refreshTripGroups]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<TestAccountTripChangeDetail>(testAccountTripChangeEvent, {
        detail: { tripId: workingTripId }
      })
    );
  }, [workingTripId]);

  function openTripGroup(groupId: string) {
    setSelectedTripId(groupId);
  }

  function backToTripGroups() {
    setSelectedTripId(null);
    void refreshTripGroups();
  }

  function openNewTripModal() {
    setNewTripForm({
      name: "",
      startDate: data.trip.startDate,
      endDate: data.trip.endDate,
      hotelLocation: ""
    });
    setShowNewTripModal(true);
  }

  function openTripSettingsModal() {
    setTripSettingsForm({
      name: data.trip.name,
      startDate: data.trip.startDate,
      endDate: data.trip.endDate,
      hotelLocation: data.trip.hotelAddress ?? data.trip.hotelMapUrl ?? ""
    });
    setShowTripSettingsModal(true);
  }

  function submitTripSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hotelLocation = locationInputParts(
      tripSettingsForm.hotelLocation,
      data.trip.hotelAddress,
      data.trip.hotelMapUrl
    );

    actions.updateTripSettings({
      name: tripSettingsForm.name,
      startDate: tripSettingsForm.startDate,
      endDate: tripSettingsForm.endDate,
      hotelAddress: hotelLocation.address,
      hotelMapUrl: hotelLocation.mapUrl
    });
    setShowTripSettingsModal(false);
    void refreshTripGroups();
  }

  async function importSeedTrip() {
    const seeded = await importSeedTripData(tripId);

    setTripGroups(await listTripGroups(tripId));
    setSelectedTripId(seeded.trip.id);
  }

  function updateNewTrip<K extends keyof NewTripForm>(
    key: K,
    value: NewTripForm[K]
  ) {
    setNewTripForm((current) => ({ ...current, [key]: value }));
  }

  async function createTripGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !auth.user ||
      !newTripForm.name.trim() ||
      !newTripForm.startDate ||
      !newTripForm.endDate
    ) {
      return;
    }

    const slug = `${newTripForm.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
      .replace(/^-|-$/g, "") || "trip"}-${Date.now().toString(36)}`;
    const nextData = createSeedTripData(slug);
    const ownerMember: TripMember = {
      id: `member-${auth.user.id}`,
      appUserId: auth.user.id,
      displayName: auth.user.username,
      role: "owner",
      color: "teal"
    };

    nextData.trip.name = newTripForm.name.trim();
    nextData.trip.subtitle = "新的行程，先收集地点，再生成行程草稿。";
    nextData.trip.ownerMemberId = ownerMember.id;
    nextData.trip.startDate = newTripForm.startDate;
    nextData.trip.endDate = newTripForm.endDate;
    nextData.trip.phase = "collecting_places";
    nextData.trip.inviteCode = createInviteCode();
    nextData.trip.inviteUrl = invitePath(nextData.trip.inviteCode);
    const hotelLocation = locationInputParts(newTripForm.hotelLocation);
    nextData.trip.hotelAddress = hotelLocation.address || undefined;
    nextData.trip.hotelMapUrl = hotelLocation.mapUrl;
    nextData.places = [];
    nextData.placeVotes = [];
    nextData.members = [ownerMember];
    nextData.currentMemberId = ownerMember.id;
    nextData.itineraryVersions = [];
    nextData.currentItineraryVersionId = "";
    nextData.itineraryVotes = [];
    nextData.updatedAt = new Date().toISOString();

    await saveTripData(nextData);
    setActiveTripMemberId(slug, ownerMember.id);
    setTripGroups(await listTripGroups(tripId));
    setSelectedTripId(slug);
    setShowNewTripModal(false);
  }

  async function deleteTripGroup(group: TripGroupSummary) {
    if (!window.confirm(`删除行程「${group.name}」？`)) {
      return;
    }

    await deleteTripData(group.id);
    setTripGroups((current) => current.filter((item) => item.id !== group.id));
    void refreshTripGroups();

    if (selectedTripId === group.id) {
      setSelectedTripId(null);
    }
  }

  function updateItemForm<K extends keyof ItemFormState>(
    key: K,
    value: ItemFormState[K]
  ) {
    setItemForm((current) => ({ ...current, [key]: value }));
  }

  function openAddItem(dayId?: string) {
    if (!activeVersion) {
      return;
    }

    const fallbackDayId = activeVersion.days[0]?.id ?? "";

    setEditingItem(null);
    setItemForm(defaultItemForm(dayId || fallbackDayId));
    setShowAddItemModal(true);
  }

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeVersion || !selectedDayId || !itemForm.title.trim()) {
      return;
    }

    const input: ItineraryItemInput = {
      versionId: activeVersion.id,
      dayId: selectedDayId,
      title: itemForm.title,
      placeId: itemForm.placeId || undefined,
      startTime: itemForm.startTime,
      endTime: itemForm.endTime,
      notes: itemForm.notes,
      isLocked: itemForm.isLocked
    };

    if (editingItem) {
      actions.updateItineraryItem({ ...input, itemId: editingItem.id });
    } else {
      actions.addItineraryItem(input);
    }

    setItemForm(defaultItemForm(selectedDayId));
    setEditingItem(null);
    setShowAddItemModal(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4">
      {!selectedTripId ? (
        <TripGroupList
          tripGroups={tripGroups}
          currentUser={auth.user}
          isUserLoading={auth.isLoading}
          onOpenTrip={openTripGroup}
          onCreateTrip={openNewTripModal}
          onImportSeedTrip={importSeedTrip}
          onDeleteTrip={deleteTripGroup}
        />
      ) : activeVersion ? (
        <ItineraryDetail
          version={activeVersion}
          hotelAddress={data.trip.hotelAddress}
          hotelMapUrl={data.trip.hotelMapUrl}
          placeById={placeById}
          currentMember={currentMember}
          members={data.members}
          votes={data.itineraryVotes.filter(
            (vote) => vote.versionId === activeVersion.id
          )}
          isOwner={isOwner}
          onBack={backToTripGroups}
          onVote={(value) => {
            setVoteIntent(value);
            setShowVoteModal(true);
          }}
          onAddItem={openAddItem}
          onOrganizeWithAi={() => setAiModalMode("organize")}
          onOpenSettings={openTripSettingsModal}
          onConfirmFinal={() => actions.confirmItineraryVersion(activeVersion.id)}
          onCancelFinal={() => actions.cancelFinalItineraryVersion(activeVersion.id)}
          onManageItinerary={() => setShowManageItineraryModal(true)}
          onManageDay={setManagedDayId}
          onDeleteDay={(dayId) => {
            const day = activeVersion.days.find((candidate) => candidate.id === dayId);

            if (!day || !window.confirm(`删除 ${formatDateLabel(day.date)} 的整天安排？`)) {
              return;
            }

            actions.deleteItineraryDays(activeVersion.id, [dayId]);
          }}
        />
      ) : (
        <TripGroupWorkspace
          data={data}
          isOwner={isOwner}
          onBack={backToTripGroups}
          onOpenSettings={openTripSettingsModal}
          onGenerateAi={() => setAiModalMode("generate")}
        />
      )}

      {activeVersion ? (
        <>
          <ItineraryVoteModal
            key={`${activeVersion.id}-${currentMember.id}-${voteIntent ?? "none"}`}
            open={showVoteModal}
            version={activeVersion}
            initialValue={voteIntent}
            votes={data.itineraryVotes.filter(
              (vote) => vote.versionId === activeVersion.id
            )}
            members={data.members}
            currentMember={currentMember}
            onClose={() => {
              setVoteIntent(null);
              setShowVoteModal(false);
            }}
            onVote={(value, reason) => {
              actions.setItineraryVote(
                activeVersion.id,
                currentMember.id,
                value,
                reason
              );
              setVoteIntent(null);
              setShowVoteModal(false);
            }}
          />

          {managedDay ? (
            <ManageDayActivitiesModal
              key={`${activeVersion.id}-${managedDay.id}`}
              open
              day={managedDay}
              placeById={placeById}
              onClose={() => setManagedDayId(null)}
              onEditActivity={(item) => {
                setManagedDayId(null);
                setEditingItem(item);
                setItemForm(itemToForm(item));
                setShowAddItemModal(true);
              }}
              onDeleteActivity={(item) => {
                if (window.confirm(`删除活动「${item.title}」？`)) {
                  actions.deleteItineraryItem(activeVersion.id, item.id);
                }
              }}
            />
          ) : null}

          <ManageItineraryModal
            open={showManageItineraryModal}
            version={activeVersion}
            onClose={() => setShowManageItineraryModal(false)}
            onAddDay={(input) =>
              actions.addItineraryDay({ ...input, versionId: activeVersion.id })
            }
            onUpdateDay={(dayId, input) =>
              actions.updateItineraryDay({
                ...input,
                versionId: activeVersion.id,
                dayId
              })
            }
            onDeleteDays={(dayIds) =>
              actions.deleteItineraryDays(activeVersion.id, dayIds)
            }
          />

          <Modal
            open={showAddItemModal}
            title={editingItem ? "编辑活动" : "添加活动"}
            description="活动可以来自 AI 草稿，也可以由成员手动调整。"
            onClose={() => {
              setEditingItem(null);
              setShowAddItemModal(false);
            }}
          >
            <form className="grid gap-3" onSubmit={submitItem}>
              <input
                className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
                placeholder="活动标题"
                value={itemForm.title}
                onChange={(event) => updateItemForm("title", event.target.value)}
              />
              <PlacePicker
                rankings={availablePlaceRankings}
                selectedPlaceId={itemForm.placeId}
                onSelect={(placeId) => updateItemForm("placeId", placeId)}
              />
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="col-span-2 grid gap-2">
                  <legend className="text-sm font-medium">时间段</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm font-normal"
                      aria-label="开始时间"
                      type="time"
                      value={itemForm.startTime}
                      onChange={(event) =>
                        updateItemForm("startTime", event.target.value)
                      }
                    />
                    <input
                      className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm font-normal"
                      aria-label="结束时间"
                      type="time"
                      value={itemForm.endTime}
                      onChange={(event) =>
                        updateItemForm("endTime", event.target.value)
                      }
                    />
                  </div>
                </fieldset>
              </div>
              <textarea
                className="focus-ring min-h-20 rounded-lg border border-input bg-white px-3 py-2 text-sm"
                placeholder="备注"
                value={itemForm.notes}
                onChange={(event) => updateItemForm("notes", event.target.value)}
              />
              <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={itemForm.isLocked}
                  onChange={(event) =>
                    updateItemForm("isLocked", event.target.checked)
                  }
                />
                锁定安排
              </label>
              <Button type="submit" disabled={!itemForm.title.trim()}>
                {editingItem ? "保存修改" : "添加活动"}
              </Button>
            </form>
          </Modal>
        </>
      ) : null}

      <Modal
        open={showNewTripModal}
        title="发起行程"
        description="创建后会出现在行程列表，不会覆盖原来的地点池。"
        onClose={() => setShowNewTripModal(false)}
      >
        <form className="grid gap-3" onSubmit={createTripGroup}>
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            placeholder="行程名称"
            value={newTripForm.name}
            onChange={(event) => updateNewTrip("name", event.target.value)}
          />
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            type="date"
            value={newTripForm.startDate}
            onChange={(event) => updateNewTrip("startDate", event.target.value)}
          />
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            type="date"
            value={newTripForm.endDate}
            onChange={(event) => updateNewTrip("endDate", event.target.value)}
          />
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            placeholder="酒店地址或地图链接（可选）"
            value={newTripForm.hotelLocation}
            onChange={(event) =>
              updateNewTrip("hotelLocation", event.target.value)
            }
          />
          <Button
            type="submit"
            disabled={
              !newTripForm.name.trim() ||
              !newTripForm.startDate ||
              !newTripForm.endDate
            }
          >
            创建并进入行程
          </Button>
        </form>
      </Modal>

      <Modal
        open={showTripSettingsModal}
        title="行程设置"
        description={data.trip.name}
        onClose={() => setShowTripSettingsModal(false)}
      >
        <form className="grid gap-3" onSubmit={submitTripSettings}>
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            placeholder="行程名称"
            value={tripSettingsForm.name}
            onChange={(event) =>
              setTripSettingsForm((current) => ({
                ...current,
                name: event.target.value
              }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
              type="date"
              value={tripSettingsForm.startDate}
              onChange={(event) =>
                setTripSettingsForm((current) => ({
                  ...current,
                  startDate: event.target.value
                }))
              }
            />
            <input
              className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
              type="date"
              value={tripSettingsForm.endDate}
              onChange={(event) =>
                setTripSettingsForm((current) => ({
                  ...current,
                  endDate: event.target.value
                }))
              }
            />
          </div>
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            placeholder="酒店地址或地图链接（可选）"
            value={tripSettingsForm.hotelLocation}
            onChange={(event) =>
              setTripSettingsForm((current) => ({
                ...current,
                hotelLocation: event.target.value
              }))
            }
          />
          <Button
            type="submit"
            disabled={
              !tripSettingsForm.name.trim() ||
              !tripSettingsForm.startDate ||
              !tripSettingsForm.endDate
            }
          >
            保存设置
          </Button>
        </form>
      </Modal>

      <AiActionModal
        mode={aiModalMode}
        title={data.trip.name}
        hasPlaces={data.places.length > 0}
        onClose={() => setAiModalMode(null)}
      />
    </main>
  );
}

function TripGroupList({
  tripGroups,
  currentUser,
  isUserLoading,
  onOpenTrip,
  onCreateTrip,
  onImportSeedTrip,
  onDeleteTrip
}: {
  tripGroups: TripGroupSummary[];
  currentUser: AuthUser | null;
  isUserLoading: boolean;
  onOpenTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onImportSeedTrip: () => void;
  onDeleteTrip: (group: TripGroupSummary) => void;
}) {
  const managedGroups = tripGroups.filter((group) =>
    isTripManagedByUser(group, currentUser)
  );
  const joinedGroups = tripGroups.filter((group) =>
    isTripJoinedByUser(group, currentUser)
  );
  const hasVisibleTrips = managedGroups.length > 0 || joinedGroups.length > 0;

  return (
    <>
      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">我的行程</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">行程</h1>
        </div>
        <Button type="button" onClick={onCreateTrip}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          发起行程
        </Button>
      </section>

      {isUserLoading ? (
        <section className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground shadow-soft">
          正在读取账号
        </section>
      ) : (
        <>
          <TripGroupSection
            title="我管理的行程"
            groups={managedGroups}
            emptyText="暂时没有你管理的行程。"
            canDelete
            onOpenTrip={onOpenTrip}
            onDeleteTrip={onDeleteTrip}
          />
          <TripGroupSection
            title="我加入的行程"
            groups={joinedGroups}
            emptyText="暂时没有你加入的行程。"
            canDelete={false}
            onOpenTrip={onOpenTrip}
            onDeleteTrip={onDeleteTrip}
          />
        </>
      )}

      {!isUserLoading && !hasVisibleTrips ? (
        <section className="grid gap-3">
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-center shadow-soft">
            <p className="text-base font-semibold">还没有行程数据</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              上线测试可以先导入当前测试行程；导入后它会成为 Supabase 里的真实数据，可编辑也可删除。
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={onImportSeedTrip}>
                <Database className="h-4 w-4" aria-hidden="true" />
                导入测试行程
              </Button>
              <Button type="button" variant="outline" onClick={onCreateTrip}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                发起新行程
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function TripGroupSection({
  title,
  groups,
  emptyText,
  canDelete,
  onOpenTrip,
  onDeleteTrip
}: {
  title: string;
  groups: TripGroupSummary[];
  emptyText: string;
  canDelete: boolean;
  onOpenTrip: (tripId: string) => void;
  onDeleteTrip: (group: TripGroupSummary) => void;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Badge tone="outline">{groups.length}</Badge>
      </div>
      {groups.map((group) => (
        <TripGroupCard
          key={group.id}
          group={group}
          canDelete={canDelete}
          onOpenTrip={onOpenTrip}
          onDeleteTrip={onDeleteTrip}
        />
      ))}
      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-5 text-center text-sm text-muted-foreground shadow-soft">
          {emptyText}
        </div>
      ) : null}
    </section>
  );
}

function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    if (copyState === "idle") {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopyState("idle"), 1800);

    return () => window.clearTimeout(timer);
  }, [copyState]);

  const isCopied = copyState === "copied";
  const isFailed = copyState === "failed";

  return (
    <Button
      type="button"
      variant={isCopied ? "quiet" : "outline"}
      onClick={async () => {
        setCopyState((await copyText(inviteUrl)) ? "copied" : "failed");
      }}
    >
      {isCopied ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {isCopied ? "已复制链接" : isFailed ? "复制失败" : "复制邀请"}
    </Button>
  );
}

function HotelLocationLine({
  address,
  mapUrl
}: {
  address?: string;
  mapUrl?: string;
}) {
  const hotelStop = hotelStopForLocation(address, mapUrl);

  if (!hotelStop) {
    return null;
  }

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-muted-foreground">
      <MapPin className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
      <span>{address?.trim() || "酒店地图链接"}</span>
      <a
        className="focus-ring inline-flex items-center gap-1 rounded-md px-1 font-medium text-primary hover:underline"
        href={externalMapUrl(hotelStop)}
        rel="noreferrer"
        target="_blank"
      >
        地图
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </p>
  );
}

function TripGroupCard({
  group,
  canDelete,
  onOpenTrip,
  onDeleteTrip
}: {
  group: TripGroupSummary;
  canDelete: boolean;
  onOpenTrip: (tripId: string) => void;
  onDeleteTrip: (group: TripGroupSummary) => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">{group.name}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {group.startDate} 至 {group.endDate}
          </p>
        </div>
        <Badge tone="teal" className="shrink-0">
          {planPhaseLabels[group.phase]}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <SmallStat label="成员" value={`${group.members?.length ?? 0}`} />
        <SmallStat label="地点" value={`${group.placeCount}`} />
      </div>
      <MemberList members={group.members ?? []} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => onOpenTrip(group.id)}>
          进入行程
        </Button>
        <CopyInviteButton inviteUrl={group.inviteUrl} />
        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onDeleteTrip(group)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            删除
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function TripGroupWorkspace({
  data,
  isOwner,
  onBack,
  onOpenSettings,
  onGenerateAi
}: {
  data: ReturnType<typeof useLocalTripStore>["data"];
  isOwner: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onGenerateAi: () => void;
}) {
  return (
    <>
      <section className="space-y-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回行程列表
        </Button>

        <div className="rounded-lg border border-border bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                行程
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                {data.trip.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {data.trip.startDate} 至 {data.trip.endDate}
              </p>
              <HotelLocationLine
                address={data.trip.hotelAddress}
                mapUrl={data.trip.hotelMapUrl}
              />
            </div>
            <Badge tone="teal" className="shrink-0">
              {planPhaseLabels[data.trip.phase]}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyInviteButton inviteUrl={data.trip.inviteUrl} />
            {isOwner ? (
              <Button type="button" variant="outline" onClick={onOpenSettings}>
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                行程设置
              </Button>
            ) : null}
            <Link
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium transition hover:bg-muted/70"
              href={`/trip/${data.trip.id}/places`}
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              管理地点
            </Link>
          </div>
        </div>

      </section>

      {data.places.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-white p-6 text-center shadow-soft">
          <p className="text-base font-semibold">要先添加地点才能生成草稿</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            AI 会根据行程标题、日期时间、地点池，以及大家的想去/不想去理由生成行程草稿。
          </p>
          <Link
            className="focus-ring mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            href={`/trip/${data.trip.id}/places`}
          >
            去添加地点
          </Link>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-white p-4 shadow-soft">
          <p className="text-base font-semibold">可以生成第一版草稿</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            已有 {data.places.length} 个地点。AI 会使用行程标题、日期时间、地点和投票理由整理出第一版草稿。
          </p>
          {isOwner ? (
            <Button type="button" className="mt-4" onClick={onGenerateAi}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              生成 AI 草稿
            </Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              等待发起人生成草稿。
            </p>
          )}
        </section>
      )}
    </>
  );
}

function ItineraryDetail({
  version,
  hotelAddress,
  hotelMapUrl,
  placeById,
  currentMember,
  members,
  votes,
  isOwner,
  onBack,
  onVote,
  onAddItem,
  onOrganizeWithAi,
  onOpenSettings,
  onConfirmFinal,
  onCancelFinal,
  onManageItinerary,
  onManageDay,
  onDeleteDay
}: {
  version: ItineraryVersion;
  hotelAddress?: string;
  hotelMapUrl?: string;
  placeById: Map<string, TravelPlace>;
  currentMember: TripMember;
  members: TripMember[];
  votes: Array<{
    id: string;
    memberId: string;
    value: ItineraryVoteValue;
    reason: string;
  }>;
  isOwner: boolean;
  onBack: () => void;
  onVote: (value: ItineraryVoteValue) => void;
  onAddItem: (dayId?: string) => void;
  onOrganizeWithAi: () => void;
  onOpenSettings: () => void;
  onConfirmFinal: () => void;
  onCancelFinal: () => void;
  onManageItinerary: () => void;
  onManageDay: (dayId: string) => void;
  onDeleteDay: (dayId: string) => void;
}) {
  const routePlan = routePlanForVersion(
    version,
    placeById,
    hotelAddress,
    hotelMapUrl
  );
  const currentVote = votes.find((vote) => vote.memberId === currentMember.id);
  const upCount = votes.filter((vote) => vote.value === "up").length;
  const downCount = votes.filter((vote) => vote.value === "down").length;

  return (
    <>
      <section className="space-y-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回行程
        </Button>

        <div className="rounded-lg border border-border bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {versionDateRange(version)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                {version.label}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {itinerarySourceLabels[version.source]} / 生成于 {formatDateTime(version.createdAt)}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                活动是可编辑草稿，成员可以手动调整。
              </p>
              <HotelLocationLine address={hotelAddress} mapUrl={hotelMapUrl} />
            </div>
            <Badge tone={version.status === "final" ? "teal" : "outline"} className="shrink-0">
              {itineraryVersionStatusLabels[version.status]}
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Button
              type="button"
              variant={currentVote?.value === "up" ? "quiet" : "outline"}
              onClick={() => onVote("up")}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
              {itineraryVoteLabels.up} {upCount}
            </Button>
            <Button
              type="button"
              variant={currentVote?.value === "down" ? "quiet" : "outline"}
              onClick={() => onVote("down")}
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
              {itineraryVoteLabels.down} {downCount}
            </Button>
            {isOwner ? (
              <Button type="button" variant="outline" onClick={onOpenSettings}>
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                行程设置
              </Button>
            ) : null}
            {routePlan ? (
              <ExternalNavLink href={routePlan.href} label={routePlan.label} />
            ) : null}
          </div>

        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        {isOwner ? (
          <>
            <Button type="button" onClick={onOrganizeWithAi}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI 整理行程
            </Button>
            <Button type="button" variant="outline" onClick={onManageItinerary}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              管理行程
            </Button>
            <Button
              type="button"
              variant={version.status === "final" ? "secondary" : "outline"}
              onClick={version.status === "final" ? onCancelFinal : onConfirmFinal}
            >
              {version.status === "final" ? (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {version.status === "final" ? "取消最终版" : "确认最终版"}
            </Button>
          </>
        ) : null}
      </section>

      <Timeline
        version={version}
        placeById={placeById}
        canEdit
        onAddItem={onAddItem}
        onManageDay={onManageDay}
        onDeleteDay={onDeleteDay}
      />

      {votes.length > 0 ? (
        <section className="rounded-lg border border-border bg-white p-4 shadow-soft">
          <h2 className="text-base font-semibold">投票理由</h2>
          <div className="mt-3 divide-y divide-border">
            {votes.map((vote) => (
              <div key={vote.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{memberName(members, vote.memberId)}</p>
                  <Badge tone={vote.value === "up" ? "teal" : "sunset"}>
                    {itineraryVoteLabels[vote.value]}
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
        </section>
      ) : null}
    </>
  );
}

function Timeline({
  version,
  placeById,
  canEdit,
  onAddItem,
  onManageDay,
  onDeleteDay
}: {
  version: ItineraryVersion;
  placeById: Map<string, TravelPlace>;
  canEdit: boolean;
  onAddItem: (dayId?: string) => void;
  onManageDay: (dayId: string) => void;
  onDeleteDay: (dayId: string) => void;
}) {
  const [openMenuDayId, setOpenMenuDayId] = useState<string | null>(null);

  return (
    <section className="rounded-lg border border-border bg-white p-4 shadow-soft">
      <div className="space-y-6">
        {version.days.map((day) => (
          <div key={day.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {formatDateLabel(day.date)}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {day.title} / {day.city}
                </h2>
              </div>
              {canEdit ? (
                <div className="relative shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="管理本日活动"
                    onClick={() =>
                      setOpenMenuDayId((current) =>
                        current === day.id ? null : day.id
                      )
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {openMenuDayId === day.id ? (
                    <div className="absolute right-0 top-12 z-20 w-44 rounded-lg border border-border bg-white p-1 shadow-soft">
                      <button
                        type="button"
                        className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-muted"
                        onClick={() => {
                          setOpenMenuDayId(null);
                          onAddItem(day.id);
                        }}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        添加活动
                      </button>
                      <button
                        type="button"
                        className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-muted"
                        onClick={() => {
                          setOpenMenuDayId(null);
                          onManageDay(day.id);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        管理本日活动
                      </button>
                      <button
                        type="button"
                        className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-coral hover:bg-muted"
                        onClick={() => {
                          setOpenMenuDayId(null);
                          onDeleteDay(day.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        删除当天
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {day.summary ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {day.summary}
              </p>
            ) : null}

            <div className="mt-4 border-l-2 border-accent pl-4">
              {day.items.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  place={item.placeId ? placeById.get(item.placeId) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineItem({
  item,
  place
}: {
  item: ItineraryItem;
  place?: TravelPlace;
}) {
  return (
    <div className="relative pb-5 last:pb-0">
      <span className="absolute -left-[1.42rem] top-1 flex h-4 w-4 rounded-full border-2 border-white bg-teal shadow" />
      <div className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)]">
        <p className="text-sm font-semibold">
          {item.startTime || "--:--"} - {item.endTime || "--:--"}
        </p>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-6">{item.title}</h3>
            <Badge tone={item.isLocked ? "teal" : "outline"}>
              {item.isLocked ? "已锁定" : "可编辑"}
            </Badge>
          </div>
          {place ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {place.name}
            </p>
          ) : null}
          {item.notes ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.notes}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {place ? (
              <>
                <ExternalNavLink href={appleMapsDirectionsUrl(place)} label="Apple" />
                <ExternalNavLink href={googleMapsDirectionsUrl(place)} label="Google" />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItineraryVoteModal({
  open,
  version,
  initialValue,
  votes,
  members,
  currentMember,
  onClose,
  onVote
}: {
  open: boolean;
  version: ItineraryVersion;
  initialValue: ItineraryVoteValue | null;
  votes: Array<{
    id: string;
    memberId: string;
    value: ItineraryVoteValue;
    reason: string;
  }>;
  members: TripMember[];
  currentMember: TripMember;
  onClose: () => void;
  onVote: (value: ItineraryVoteValue, reason: string) => void;
}) {
  const currentVote = votes.find((vote) => vote.memberId === currentMember.id);
  const [selectedVote, setSelectedVote] = useState<ItineraryVoteValue | null>(
    initialValue ?? currentVote?.value ?? null
  );
  const [reason, setReason] = useState(currentVote?.reason ?? "");
  const upCount = votes.filter((vote) => vote.value === "up").length;
  const downCount = votes.filter((vote) => vote.value === "down").length;
  const needsReason = selectedVote === "down" && !reason.trim();

  return (
    <Modal
      open={open}
      title="整版行程投票"
      description={`${version.label} / ${versionDateRange(version)}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={selectedVote === "up" ? "quiet" : "outline"}
            onClick={() => setSelectedVote("up")}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            {itineraryVoteLabels.up} {upCount}
          </Button>
          <Button
            type="button"
            variant={selectedVote === "down" ? "quiet" : "outline"}
            onClick={() => setSelectedVote("down")}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            {itineraryVoteLabels.down} {downCount}
          </Button>
        </div>
        <textarea
          className="focus-ring min-h-24 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          placeholder="投票原因，不同意时必须写"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button
          type="button"
          className="w-full"
          disabled={!selectedVote || needsReason}
          onClick={() => selectedVote && onVote(selectedVote, reason)}
        >
          保存投票
        </Button>
      </div>
    </Modal>
  );
}

type DayFormState = {
  date: string;
  title: string;
  city: string;
  summary: string;
};

function ManageItineraryModal({
  open,
  version,
  onClose,
  onAddDay,
  onUpdateDay,
  onDeleteDays
}: {
  open: boolean;
  version: ItineraryVersion;
  onClose: () => void;
  onAddDay: (input: Omit<ItineraryDayInput, "versionId">) => void;
  onUpdateDay: (
    dayId: string,
    input: Omit<ItineraryDayInput, "versionId">
  ) => void;
  onDeleteDays: (dayIds: string[]) => void;
}) {
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const [form, setForm] = useState<DayFormState>(() =>
    defaultDayFormForVersion(version)
  );

  useEffect(() => {
    if (open) {
      setEditingDayId(null);
      setSelectedDayIds([]);
      setForm(defaultDayFormForVersion(version));
    }
  }, [open, version]);

  function updateForm<K extends keyof DayFormState>(
    key: K,
    value: DayFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.date || !form.title.trim() || !form.city.trim()) {
      return;
    }

    const input = {
      date: form.date,
      title: form.title,
      city: form.city,
      summary: form.summary
    };

    if (editingDayId) {
      onUpdateDay(editingDayId, input);
    } else {
      onAddDay(input);
    }

    setEditingDayId(null);
    setForm(defaultDayFormForVersion(version));
  }

  function editDay(day: ItineraryDay) {
    setEditingDayId(day.id);
    setForm({
      date: day.date,
      title: day.title,
      city: day.city,
      summary: day.summary
    });
  }

  function toggleDay(dayId: string) {
    setSelectedDayIds((current) =>
      current.includes(dayId)
        ? current.filter((id) => id !== dayId)
        : [...current, dayId]
    );
  }

  function deleteSelectedDays() {
    if (
      selectedDayIds.length === 0 ||
      !window.confirm(`删除选中的 ${selectedDayIds.length} 天安排？`)
    ) {
      return;
    }

    onDeleteDays(selectedDayIds);
    setSelectedDayIds([]);
    setEditingDayId(null);
    setForm(defaultDayFormForVersion(version));
  }

  return (
    <Modal
      open={open}
      title="管理行程"
      description="在这里管理每天的日期、标题和城市；具体活动在本日活动里管理。"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <form className="grid gap-3" onSubmit={submitDay}>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
              type="date"
              value={form.date}
              onChange={(event) => updateForm("date", event.target.value)}
            />
            <input
              className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
              placeholder="城市 / 区域"
              value={form.city}
              onChange={(event) => updateForm("city", event.target.value)}
            />
          </div>
          <input
            className="focus-ring h-11 rounded-lg border border-input bg-white px-3 text-sm"
            placeholder="当天标题"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />
          <textarea
            className="focus-ring min-h-20 rounded-lg border border-input bg-white px-3 py-2 text-sm"
            placeholder="当天摘要"
            value={form.summary}
            onChange={(event) => updateForm("summary", event.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="submit"
              disabled={!form.date || !form.title.trim() || !form.city.trim()}
            >
              {editingDayId ? "保存这一天" : "添加一天"}
            </Button>
            {editingDayId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingDayId(null);
                  setForm(defaultDayFormForVersion(version));
                }}
              >
                取消编辑
              </Button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              已有 {version.days.length} 天
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={selectedDayIds.length === 0}
              onClick={deleteSelectedDays}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              删除选中
            </Button>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border bg-white">
            {version.days.map((day) => (
              <div key={day.id} className="grid gap-3 p-3">
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selectedDayIds.includes(day.id)}
                    onChange={() => toggleDay(day.id)}
                    aria-label={`选择 ${day.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {formatDateLabel(day.date)}
                    </p>
                    <p className="mt-1 font-medium leading-6">
                      {day.title} / {day.city}
                    </p>
                    {day.summary ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {day.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editDay(day)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    编辑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(`删除 ${formatDateLabel(day.date)}？`)) {
                        onDeleteDays([day.id]);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ManageDayActivitiesModal({
  open,
  day,
  placeById,
  onClose,
  onEditActivity,
  onDeleteActivity
}: {
  open: boolean;
  day: ItineraryDay;
  placeById: Map<string, TravelPlace>;
  onClose: () => void;
  onEditActivity: (item: ItineraryItem) => void;
  onDeleteActivity: (item: ItineraryItem) => void;
}) {
  return (
    <Modal
      open={open}
      title="管理本日活动"
      description={`${formatDateLabel(day.date)} / ${day.city}`}
      onClose={onClose}
    >
      <div className="grid gap-3">
        {day.items.length > 0 ? (
          <div className="divide-y divide-border rounded-lg border border-border bg-white">
            {day.items.map((item) => {
              const place = item.placeId ? placeById.get(item.placeId) : undefined;

              return (
                <div key={item.id} className="grid gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {item.startTime || "--:--"} - {item.endTime || "--:--"}
                    </p>
                    <p className="mt-1 font-medium leading-6">{item.title}</p>
                    {place ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {place.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onEditActivity(item)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onDeleteActivity(item)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
            今天还没有活动。
          </div>
        )}
      </div>
    </Modal>
  );
}

function AiActionModal({
  mode,
  title,
  hasPlaces,
  onClose
}: {
  mode: "generate" | "organize" | null;
  title: string;
  hasPlaces: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(mode)}
      title={mode === "organize" ? "AI 整理行程" : "生成 AI 草稿"}
      description={title}
      onClose={onClose}
    >
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          {hasPlaces
            ? "接入后，AI 会根据行程标题、日期时间、地点池、想去/不想去投票和理由整理行程。"
            : "要先添加地点，AI 才能根据地点和投票情况生成草稿。"}
        </p>
        <p>
          {mode === "organize"
            ? "整理结果会作为新的草稿内容，由发起人确认后再给成员投票。"
            : "生成结果会先作为草稿，最终版仍由发起人确认。"}
        </p>
        <Button type="button" className="w-full" onClick={onClose}>
          知道了
        </Button>
      </div>
    </Modal>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          <UsersRound className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
          {member.displayName}
        </span>
      ))}
    </div>
  );
}

function PlacePicker({
  rankings,
  selectedPlaceId,
  onSelect
}: {
  rankings: RankedPlace[];
  selectedPlaceId: string;
  onSelect: (placeId: string) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">关联地点</legend>
      <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
        <button
          type="button"
          className={cn(
            "focus-ring flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm transition",
            selectedPlaceId
              ? "border-border bg-white hover:bg-muted/70"
              : "border-primary bg-primary text-primary-foreground"
          )}
          onClick={() => onSelect("")}
        >
          <span className="font-medium">不关联地点</span>
          {!selectedPlaceId ? <span className="text-xs">已选</span> : null}
        </button>

        {rankings.map((ranking) => {
          const selected = selectedPlaceId === ranking.place.id;
          const metaText = placeMetaText(ranking.place);

          return (
            <button
              key={ranking.place.id}
              type="button"
              className={cn(
                "focus-ring grid gap-1 rounded-lg border p-3 text-left transition",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white hover:bg-muted/70"
              )}
              onClick={() => onSelect(ranking.place.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-medium leading-6">
                  {ranking.place.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    selected ? "bg-white/20" : "bg-accent text-accent-foreground"
                  )}
                >
                  {ranking.score} 分
                </span>
              </div>
              {metaText ? (
                <p
                  className={cn(
                    "text-xs leading-5",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {metaText}
                </p>
              ) : null}
              <p
                className={cn(
                  "text-xs leading-5",
                  selected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {placeVoteLabels.up} {ranking.upCount} · {placeVoteLabels.down}{" "}
                {ranking.downCount}
              </p>
            </button>
          );
        })}
        {rankings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-4 text-sm leading-6 text-muted-foreground">
            可关联地点都已安排到活动里。
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function ExternalNavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className={cn(
        "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:bg-muted/70"
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      {label === "总路线" ? (
        <Route className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      )}
    </a>
  );
}

function itemToForm(item: ItineraryItem): ItemFormState {
  return {
    dayId: item.dayId,
    title: item.title,
    placeId: item.placeId ?? "",
    startTime: item.startTime,
    endTime: item.endTime,
    notes: item.notes,
    isLocked: item.isLocked
  };
}

function defaultDayFormForVersion(version: ItineraryVersion): DayFormState {
  const sortedDays = [...version.days].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const lastDay = sortedDays[sortedDays.length - 1];

  return {
    date: lastDay ? nextDateString(lastDay.date) : "",
    title: "",
    city: lastDay?.city ?? "",
    summary: ""
  };
}

function nextDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

  return nextDate.toISOString().slice(0, 10);
}

function getCurrentVersion(
  versions: ItineraryVersion[],
  currentVersionId: string
) {
  return (
    versions.find((version) => version.id === currentVersionId) ??
    [...versions].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )[0]
  );
}

function placesForVersion(
  version: ItineraryVersion,
  placeById: Map<string, TravelPlace>
) {
  const placeIds = version.days.flatMap((day) =>
    day.items.map((item) => item.placeId).filter(Boolean)
  );

  return placeIds
    .map((placeId) => placeById.get(placeId as string))
    .filter((place): place is TravelPlace => Boolean(place));
}

function routePlanForVersion(
  version: ItineraryVersion,
  placeById: Map<string, TravelPlace>,
  hotelAddress?: string,
  hotelMapUrl?: string
) {
  const routePlaces = placesForVersion(version, placeById);
  const hotelStop = hotelStopForLocation(hotelAddress, hotelMapUrl);

  if (hotelStop) {
    const stops = [hotelStop, ...routePlaces];

    return stops.length > 1
      ? { href: googleMapsRouteUrl(stops), label: "总路线" }
      : { href: externalMapUrl(hotelStop), label: "查看酒店" };
  }

  if (routePlaces.length > 1) {
    return { href: googleMapsRouteUrl(routePlaces), label: "总路线" };
  }

  if (routePlaces.length === 1) {
    return { href: externalMapUrl(routePlaces[0]), label: "查看地点" };
  }

  return null;
}

function hotelStopForLocation(
  hotelAddress?: string,
  hotelMapUrl?: string
): MapDestination | null {
  const address = hotelAddress?.trim();
  const mapUrl = hotelMapUrl?.trim();

  return address || mapUrl
    ? {
        name: "酒店",
        address: address || mapUrl || "",
        city: "",
        mapUrl
      }
    : null;
}

function versionDateRange(version: ItineraryVersion) {
  const dates = version.days.map((day) => day.date).sort();

  if (dates.length === 0) {
    return "未设置日期";
  }

  return dates[0] === dates[dates.length - 1]
    ? dates[0]
    : `${dates[0]} 至 ${dates[dates.length - 1]}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function memberName(members: TripMember[], memberId: string) {
  return members.find((member) => member.id === memberId)?.displayName ?? "成员";
}

function placeMetaText(place: TravelPlace) {
  return [place.city, place.category, place.suggestedDuration]
    .filter(Boolean)
    .join(" / ");
}

function memberBelongsToUser(member: TripMember, user: AuthUser | null) {
  if (!user) {
    return false;
  }

  return (
    member.appUserId === user.id ||
    member.displayName.trim().toLowerCase() === user.username
  );
}

function isTripManagedByUser(group: TripGroupSummary, user: AuthUser | null) {
  return group.members.some(
    (member) => member.role === "owner" && memberBelongsToUser(member, user)
  );
}

function isTripJoinedByUser(group: TripGroupSummary, user: AuthUser | null) {
  return group.members.some(
    (member) => member.role !== "owner" && memberBelongsToUser(member, user)
  );
}

async function copyText(text: string) {
  const copyValue =
    typeof window !== "undefined" && text.startsWith("/")
      ? `${window.location.origin}${text}`
      : text;

  if (!copyValue) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(copyValue);
      return true;
    }
  } catch {
    return fallbackCopyText(copyValue);
  }

  return fallbackCopyText(copyValue);
}

function fallbackCopyText(copyValue: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");

  textarea.value = copyValue;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
