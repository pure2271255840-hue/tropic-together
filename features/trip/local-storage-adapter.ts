"use client";

import {
  cloneData,
  compactTripItineraryHistory,
  summarizeTripGroup
} from "./data-shape";
import { createSeedTripData } from "./seed-data";
import type {
  AiItineraryDraft,
  ItineraryDay,
  ItineraryDayInput,
  ItineraryItemInput,
  ItineraryVote,
  ItineraryVoteValue,
  PlaceInput,
  PlaceVote,
  PlaceVoteValue,
  TripGroupSummary,
  TripSettingsInput,
  TripPhase1Data
} from "./types";
import { parseTripDestinations } from "./trip-context";

const storageVersion = 2;
const storagePrefix = "tropic-together:phase1:";
const directoryKey = `${storagePrefix}directory`;

type StoredTripData = {
  version: number;
  data: TripPhase1Data;
};

function storageKey(tripId: string) {
  return `${storagePrefix}${tripId || "default"}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeLookupText(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function readStoredTripData(tripId: string): TripPhase1Data | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKey(tripId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredTripData;

    if (
      parsed.version === storageVersion &&
      parsed.data?.trip?.phase &&
      Array.isArray(parsed.data.itineraryVersions)
    ) {
      return compactTripItineraryHistory(parsed.data);
    }
  } catch {
    window.localStorage.removeItem(storageKey(tripId));
  }

  return null;
}

function readDirectory() {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(directoryKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as TripGroupSummary[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(directoryKey);
    return [];
  }
}

function writeDirectory(items: TripGroupSummary[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(directoryKey, JSON.stringify(items));
}

export function listLocalTripGroups(defaultTripId = "penang-kota-kinabalu-2026") {
  if (!canUseLocalStorage()) {
    return [summarizeTripGroup(createSeedTripData(defaultTripId))];
  }

  const groupsById = new Map<string, TripGroupSummary>();

  for (const item of readDirectory()) {
    groupsById.set(item.id, item);
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(storagePrefix) || key === directoryKey) {
      continue;
    }

    const tripId = key.slice(storagePrefix.length);
    const storedData = readStoredTripData(tripId);

    if (storedData) {
      groupsById.set(storedData.trip.id, summarizeTripGroup(storedData));
    }
  }

  if (groupsById.size === 0) {
    saveLocalTripData(createSeedTripData(defaultTripId));
    return listLocalTripGroups(defaultTripId);
  }

  const groups = Array.from(groupsById.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );

  writeDirectory(groups);

  return groups;
}

function upsertTripGroup(data: TripPhase1Data) {
  const summary = summarizeTripGroup(data);
  const next = [
    summary,
    ...readDirectory().filter((item) => item.id !== summary.id)
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  writeDirectory(next);
}

export function loadLocalTripData(tripId: string): TripPhase1Data {
  if (!canUseLocalStorage()) {
    return createSeedTripData(tripId);
  }

  const storedData = readStoredTripData(tripId);

  if (!storedData) {
    const seeded = compactTripItineraryHistory(createSeedTripData(tripId));
    saveLocalTripData(seeded);
    return seeded;
  }

  const compactedData = compactTripItineraryHistory(storedData);
  upsertTripGroup(compactedData);
  return compactedData;
}

export function saveLocalTripData(data: TripPhase1Data) {
  if (!canUseLocalStorage()) {
    return;
  }

  const compactedData = compactTripItineraryHistory(data);

  window.localStorage.setItem(
    storageKey(compactedData.trip.id),
    JSON.stringify({ version: storageVersion, data: compactedData })
  );
  upsertTripGroup(compactedData);
}

export function resetLocalTripData(tripId: string) {
  const seeded = compactTripItineraryHistory(createSeedTripData(tripId));
  saveLocalTripData(seeded);
  return seeded;
}

export function deleteLocalTripGroup(tripId: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(storageKey(tripId));
  writeDirectory(readDirectory().filter((item) => item.id !== tripId));
}

export function addPlaceToTrip(data: TripPhase1Data, input: PlaceInput) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.places.unshift({
    id: makeId("place"),
    tripId: next.trip.id,
    name: input.name.trim(),
    officialName: input.officialName?.trim() || undefined,
    activityTitle: input.activityTitle?.trim() || undefined,
    city: input.city.trim(),
    category: input.category.trim(),
    initialTag: input.initialTag,
    address: input.address.trim(),
    mapUrl: input.mapUrl?.trim() || undefined,
    notes: input.notes.trim(),
    suggestedDuration: input.suggestedDuration.trim(),
    coordinate:
      Number.isFinite(input.lat) && Number.isFinite(input.lng)
        ? { lat: Number(input.lat), lng: Number(input.lng) }
        : undefined,
    poiProvider: input.poiProvider,
    poiId: input.poiId?.trim() || undefined,
    poiTypeCode: input.poiTypeCode?.trim() || undefined,
    district: input.district?.trim() || undefined,
    adcode: input.adcode?.trim() || undefined,
    citycode: input.citycode?.trim() || undefined,
    coordinateSource:
      input.coordinateSource ?? (input.poiId ? "amap_poi" : "manual"),
    locationStatus:
      input.locationStatus ?? (input.poiId ? "verified" : "needs_confirmation"),
    addedByMemberId: next.currentMemberId,
    createdAt: timestamp,
    updatedAt: timestamp
  });
  next.updatedAt = timestamp;

  return next;
}

export function updatePlaceInTrip(
  data: TripPhase1Data,
  placeId: string,
  input: PlaceInput
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.places = next.places.map((place) =>
    place.id === placeId
      ? {
          ...place,
          name: input.name.trim(),
          officialName: input.officialName?.trim() || place.officialName,
          activityTitle: input.activityTitle?.trim() || place.activityTitle,
          city: input.city.trim(),
          category: input.category.trim(),
          initialTag: input.initialTag,
          address: input.address.trim(),
          mapUrl: input.mapUrl?.trim() || undefined,
          notes: input.notes.trim(),
          suggestedDuration: input.suggestedDuration.trim(),
          coordinate:
            Number.isFinite(input.lat) && Number.isFinite(input.lng)
              ? { lat: Number(input.lat), lng: Number(input.lng) }
              : undefined,
          poiProvider: input.poiProvider ?? place.poiProvider,
          poiId: input.poiId?.trim() || place.poiId,
          poiTypeCode: input.poiTypeCode?.trim() || place.poiTypeCode,
          district: input.district?.trim() || place.district,
          adcode: input.adcode?.trim() || place.adcode,
          citycode: input.citycode?.trim() || place.citycode,
          coordinateSource:
            input.coordinateSource ?? place.coordinateSource ?? "manual",
          locationStatus:
            input.locationStatus ??
            place.locationStatus ??
            (place.poiId ? "verified" : "needs_confirmation"),
          updatedAt: timestamp
        }
      : place
  );
  next.updatedAt = timestamp;

  return next;
}

export function updateTripSettingsInTrip(
  data: TripPhase1Data,
  input: TripSettingsInput
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.trip.name = input.name?.trim() || next.trip.name;
  next.trip.startDate = input.startDate || next.trip.startDate;
  next.trip.endDate = input.endDate || next.trip.endDate;
  if (input.destinations) {
    next.trip.destinations = parseTripDestinations(input.destinations.join("、"));
  }
  if (input.timezone?.trim()) {
    next.trip.timezone = input.timezone.trim();
  }
  next.trip.hotelAddress = input.hotelAddress?.trim() || undefined;
  next.trip.hotelMapUrl = input.hotelMapUrl?.trim() || undefined;
  next.updatedAt = timestamp;

  return next;
}

export function deletePlaceFromTrip(data: TripPhase1Data, placeId: string) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.places = next.places.filter((place) => place.id !== placeId);
  next.placeVotes = next.placeVotes.filter((vote) => vote.placeId !== placeId);
  next.itineraryVersions = next.itineraryVersions.map((version) => ({
    ...version,
    updatedAt: timestamp,
    days: version.days.map((day) => ({
      ...day,
      items: day.items.map((item) =>
        item.placeId === placeId ? { ...item, placeId: undefined } : item
      )
    }))
  }));
  next.updatedAt = timestamp;

  return next;
}

export function setPlaceVoteInTrip(
  data: TripPhase1Data,
  placeId: string,
  memberId: string,
  value: PlaceVoteValue,
  reason: string
) {
  const next = cloneData(data);
  const timestamp = nowIso();
  const existing = next.placeVotes.find(
    (vote) => vote.placeId === placeId && vote.memberId === memberId
  );

  if (existing) {
    existing.value = value;
    existing.reason = reason.trim();
    existing.updatedAt = timestamp;
  } else {
    const vote: PlaceVote = {
      id: makeId("place-vote"),
      placeId,
      memberId,
      value,
      reason: reason.trim(),
      updatedAt: timestamp
    };
    next.placeVotes.push(vote);
  }

  next.updatedAt = timestamp;
  return next;
}

export function addItineraryItemToTrip(
  data: TripPhase1Data,
  input: ItineraryItemInput
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === input.versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: version.days.map((day) =>
            day.id === input.dayId
              ? {
                  ...day,
                  items: [
                    ...day.items,
                    {
                      id: makeId("item"),
                      dayId: input.dayId,
                      createdByMemberId: next.currentMemberId,
                      title: input.title.trim(),
                      placeId: input.placeId || undefined,
                      startTime: input.startTime.trim(),
                      endTime: input.endTime.trim(),
                      notes: input.notes.trim(),
                      isLocked: input.isLocked
                    }
                  ].sort((left, right) =>
                    left.startTime.localeCompare(right.startTime)
                  )
                }
              : day
          )
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function addItineraryDayToTrip(
  data: TripPhase1Data,
  input: ItineraryDayInput
) {
  const next = cloneData(data);
  const timestamp = nowIso();
  const dayId = makeId("day");

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === input.versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: [
            ...version.days,
            {
              id: dayId,
              versionId: input.versionId,
              createdByMemberId: next.currentMemberId,
              date: input.date,
              title: input.title.trim(),
              city: input.city.trim(),
              summary: input.summary.trim(),
              items: []
            }
          ].sort((left, right) => left.date.localeCompare(right.date))
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function updateItineraryDayInTrip(
  data: TripPhase1Data,
  input: ItineraryDayInput & { dayId: string }
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === input.versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: version.days
            .map((day) =>
              day.id === input.dayId
                ? {
                    ...day,
                    date: input.date,
                    title: input.title.trim(),
                    city: input.city.trim(),
                    summary: input.summary.trim()
                  }
                : day
            )
            .sort((left, right) => left.date.localeCompare(right.date))
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function deleteItineraryDaysFromTrip(
  data: TripPhase1Data,
  versionId: string,
  dayIds: string[]
) {
  const next = cloneData(data);
  const timestamp = nowIso();
  const deletedDayIds = new Set(dayIds);

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: version.days.filter((day) => !deletedDayIds.has(day.id))
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function setItineraryItemsLockedInDateRange(
  data: TripPhase1Data,
  versionId: string,
  startDate: string,
  endDate: string,
  isLocked: boolean
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: version.days.map((day) => {
            const inRange =
              (!startDate || day.date >= startDate) &&
              (!endDate || day.date <= endDate);

            return inRange
              ? {
                  ...day,
                  items: day.items.map((item) => ({ ...item, isLocked }))
                }
              : day;
          })
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function updateItineraryItemInTrip(
  data: TripPhase1Data,
  input: ItineraryItemInput & { itemId: string }
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === input.versionId
      ? (() => {
          const currentItem = version.days
            .flatMap((day) => day.items)
            .find((item) => item.id === input.itemId);

          return {
            ...version,
            updatedAt: timestamp,
            days: version.days.map((day) => {
              const itemsWithoutCurrent = day.items.filter(
                (item) => item.id !== input.itemId
              );

              if (day.id !== input.dayId) {
                return { ...day, items: itemsWithoutCurrent };
              }

              return {
                ...day,
                items: [
                  ...itemsWithoutCurrent,
                  {
                    id: input.itemId,
                    dayId: input.dayId,
                    createdByMemberId:
                      currentItem?.createdByMemberId ?? next.currentMemberId,
                    title: input.title.trim(),
                    placeId: input.placeId || undefined,
                    startTime: input.startTime.trim(),
                    endTime: input.endTime.trim(),
                    notes: input.notes.trim(),
                    isLocked: input.isLocked
                  }
                ].sort((left, right) =>
                  left.startTime.localeCompare(right.startTime)
                )
              };
            })
          };
      })()
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function deleteItineraryItemFromTrip(
  data: TripPhase1Data,
  versionId: string,
  itemId: string
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: version.days.map((day) => ({
            ...day,
            items: day.items.filter((item) => item.id !== itemId)
          }))
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function setItineraryItemLockedInTrip(
  data: TripPhase1Data,
  versionId: string,
  itemId: string,
  isLocked: boolean
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === versionId
      ? {
          ...version,
          updatedAt: timestamp,
          days: version.days.map((day) => ({
            ...day,
            items: day.items.map((item) =>
              item.id === itemId ? { ...item, isLocked } : item
            )
          }))
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function setItineraryVoteInTrip(
  data: TripPhase1Data,
  versionId: string,
  memberId: string,
  value: ItineraryVoteValue,
  reason: string
) {
  const next = cloneData(data);
  const timestamp = nowIso();
  const existing = next.itineraryVotes.find(
    (vote) => vote.versionId === versionId && vote.memberId === memberId
  );

  if (existing) {
    existing.value = value;
    existing.reason = reason.trim();
    existing.updatedAt = timestamp;
  } else {
    const vote: ItineraryVote = {
      id: makeId("itinerary-vote"),
      versionId,
      memberId,
      value,
      reason: reason.trim(),
      updatedAt: timestamp
    };
    next.itineraryVotes.push(vote);
  }

  next.updatedAt = timestamp;
  return next;
}

export function confirmItineraryVersionInTrip(
  data: TripPhase1Data,
  versionId: string
) {
  const next = cloneData(data);
  const timestamp = nowIso();

  next.trip.phase = "final_confirmed";
  next.currentItineraryVersionId = versionId;
  next.itineraryVersions = next.itineraryVersions.map((version) =>
    version.id === versionId
      ? {
          ...version,
          status: "final",
          label: `最终版 v${version.versionNumber}`,
          updatedAt: timestamp
        }
      : version
  );
  next.updatedAt = timestamp;

  return next;
}

export function cancelFinalItineraryVersionInTrip(
  data: TripPhase1Data,
  versionId: string
) {
  const next = cloneData(data);
  const timestamp = nowIso();
  let hasOtherFinalVersion = false;

  next.currentItineraryVersionId = versionId;
  next.itineraryVersions = next.itineraryVersions.map((version) => {
    if (version.id === versionId) {
      return {
        ...version,
        status: "draft",
        label: `草稿 v${version.versionNumber}`,
        updatedAt: timestamp
      };
    }

    if (version.status === "final") {
      hasOtherFinalVersion = true;
    }

    return version;
  });
  next.trip.phase = hasOtherFinalVersion ? "final_confirmed" : "itinerary_voting";
  next.updatedAt = timestamp;

  return next;
}

export function addAiItineraryDraftToTrip(
  data: TripPhase1Data,
  draft: AiItineraryDraft
) {
  const next = cloneData(data);
  const timestamp = nowIso();
  const currentVersion =
    next.itineraryVersions.find(
      (version) => version.id === next.currentItineraryVersionId
    ) ?? next.itineraryVersions[0];
  const versionNumber = currentVersion?.versionNumber ?? 1;
  const versionId = currentVersion?.id ?? makeId("itinerary-ai");
  const placeById = new Map(next.places.map((place) => [place.id, place]));
  const placeByName = new Map(
    next.places.flatMap((place) => {
      const names = [
        place.name,
        place.officialName,
        place.activityTitle,
        place.name.split(/\s+/)[0]
      ]
        .map(normalizeLookupText)
        .filter(Boolean);

      return names.map((name) => [name, place] as const);
    })
  );
  const nextVersion = {
    id: versionId,
    tripId: next.trip.id,
    versionNumber,
    label: draft.label?.trim() || `AI 草稿`,
    status: "draft" as const,
    source: "ai" as const,
    createdByMemberId: currentVersion?.createdByMemberId ?? next.currentMemberId,
    createdAt: currentVersion?.createdAt ?? timestamp,
    updatedAt: timestamp,
    days: completeDraftDays(next, draft.days.map((day) => {
      const dayId = makeId("day-ai");

      return {
        id: dayId,
        versionId,
        createdByMemberId: next.currentMemberId,
        date: day.date,
        title: day.title.trim() || day.date,
        city: day.city?.trim() || "",
        summary: day.summary?.trim() || "",
        items: day.items.map((item) => {
          const placeName = normalizeLookupText(item.placeName ?? "");
          const place =
            (item.placeId ? placeById.get(item.placeId) : undefined) ??
            (placeName ? placeByName.get(placeName) : undefined);

          return {
            id: makeId("item-ai"),
            dayId,
            createdByMemberId: next.currentMemberId,
            title: item.title.trim(),
            placeId: place?.id,
            startTime: item.startTime?.trim() || "",
            endTime: item.endTime?.trim() || "",
            notes: item.notes?.trim() || "",
            isLocked: false
          };
        })
      };
    }), next.trip.startDate, next.trip.endDate, versionId)
  };

  next.currentItineraryVersionId = versionId;
  next.trip.phase = "itinerary_voting";
  next.itineraryVersions = [nextVersion];
  next.itineraryVotes = next.itineraryVotes.filter(
    (vote) => vote.versionId !== versionId
  );
  next.updatedAt = timestamp;

  return next;
}

function dateStringsInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  if (![startYear, startMonth, startDay, endYear, endMonth, endDay].every(Number.isFinite)) {
    return dates;
  }

  const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  while (cursor <= end && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function completeDraftDays(
  data: TripPhase1Data,
  days: ItineraryDay[],
  startDate: string,
  endDate: string,
  versionId: string
) {
  const existingByDate = new Map(days.map((day) => [day.date, day]));

  return dateStringsInRange(startDate, endDate).map((date) => {
    const existing = existingByDate.get(date);

    if (existing) {
      return existing;
    }

    return {
      id: makeId("day-ai"),
      versionId,
      createdByMemberId: data.currentMemberId,
      date,
      title: "当天尚未安排",
      city: "",
      summary: "可以稍后补充地点或活动。",
      items: []
    };
  });
}
