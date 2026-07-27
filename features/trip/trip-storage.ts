"use client";

import {
  deleteLocalTripGroup,
  listLocalTripGroups,
  loadLocalTripData,
  resetLocalTripData,
  saveLocalTripData
} from "./local-storage-adapter";
import { compactTripItineraryHistory } from "./data-shape";
import { createSeedTripData } from "./seed-data";
import {
  deleteSupabaseTripData,
  isSupabaseTripStorageConfigured,
  listSupabaseTripGroups,
  loadSupabaseTripData,
  saveSupabaseTripData
} from "./supabase-trip-adapter";
import type { TripGroupSummary, TripPhase1Data } from "./types";

function logSupabaseFallback(error: unknown) {
  console.warn("Supabase trip storage failed; using local data.", error);
}

function persistRemote(data: TripPhase1Data) {
  if (!isSupabaseTripStorageConfigured()) {
    return;
  }

  void saveSupabaseTripData(compactTripItineraryHistory(data)).catch(
    logSupabaseFallback
  );
}

function hasItineraryHistory(data: TripPhase1Data) {
  const currentVersionId = data.currentItineraryVersionId;

  return (
    data.itineraryVersions.length > 1 ||
    data.itineraryVotes.some((vote) => vote.versionId !== currentVersionId)
  );
}

function createUnavailableTripData(tripId: string): TripPhase1Data {
  const data = compactTripItineraryHistory(createSeedTripData(tripId));

  return {
    ...data,
    trip: {
      ...data.trip,
      name: "行程不可访问",
      subtitle: "你还不是这个行程的成员，或这个行程不存在。",
      phase: "setup",
      inviteCode: undefined,
      inviteUrl: ""
    },
    members: [],
    currentMemberId: "",
    places: [],
    placeVotes: [],
    itineraryVersions: [],
    currentItineraryVersionId: "",
    itineraryVotes: [],
    updatedAt: new Date().toISOString()
  };
}

export function isRemoteTripStorageEnabled() {
  return isSupabaseTripStorageConfigured();
}

export async function loadRemoteTripData(tripId: string) {
  if (!isSupabaseTripStorageConfigured()) {
    return null;
  }

  try {
    const remoteData = await loadSupabaseTripData(tripId);

    if (!remoteData) {
      return null;
    }

    const compactedData = compactTripItineraryHistory(remoteData);

    saveLocalTripData(compactedData);
    if (hasItineraryHistory(remoteData)) {
      void saveSupabaseTripData(compactedData).catch(logSupabaseFallback);
    }

    return compactedData;
  } catch (error) {
    logSupabaseFallback(error);
    return null;
  }
}

export async function listTripGroups(defaultTripId: string) {
  if (!isSupabaseTripStorageConfigured()) {
    return listLocalTripGroups(defaultTripId);
  }

  try {
    return await listSupabaseTripGroups();
  } catch (error) {
    logSupabaseFallback(error);
    return [];
  }
}

export async function loadTripData(tripId: string) {
  if (!isSupabaseTripStorageConfigured()) {
    return loadLocalTripData(tripId);
  }

  try {
    const remoteData = await loadRemoteTripData(tripId);

    if (remoteData) {
      return remoteData;
    }

    deleteLocalTripGroup(tripId);
    return createUnavailableTripData(tripId);
  } catch (error) {
    logSupabaseFallback(error);
    return createUnavailableTripData(tripId);
  }
}

export async function saveTripData(data: TripPhase1Data) {
  const compactedData = compactTripItineraryHistory(data);

  saveLocalTripData(compactedData);

  if (!isSupabaseTripStorageConfigured()) {
    return;
  }

  try {
    await saveSupabaseTripData(compactedData);
  } catch (error) {
    logSupabaseFallback(error);
  }
}

export async function deleteTripData(tripId: string) {
  deleteLocalTripGroup(tripId);

  if (isSupabaseTripStorageConfigured()) {
    try {
      await deleteSupabaseTripData(tripId);
    } catch (error) {
      logSupabaseFallback(error);
    }
  }
}

export function resetTripData(tripId: string) {
  const seeded = resetLocalTripData(tripId);

  persistRemote(seeded);
  return seeded;
}

export async function importSeedTripData(tripId: string) {
  const seeded = compactTripItineraryHistory(createSeedTripData(tripId));

  await saveTripData(seeded);
  return seeded;
}

export function sortTripGroups(groups: TripGroupSummary[]) {
  return [...groups].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}
