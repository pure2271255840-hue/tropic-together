"use client";

import {
  deleteLocalTripGroup,
  listLocalTripGroups,
  loadLocalTripData,
  resetLocalTripData,
  saveLocalTripData
} from "./local-storage-adapter";
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

  void saveSupabaseTripData(data).catch(logSupabaseFallback);
}

export function isRemoteTripStorageEnabled() {
  return isSupabaseTripStorageConfigured();
}

export async function listTripGroups(defaultTripId: string) {
  if (!isSupabaseTripStorageConfigured()) {
    return listLocalTripGroups(defaultTripId);
  }

  try {
    return await listSupabaseTripGroups();
  } catch (error) {
    logSupabaseFallback(error);
    return listLocalTripGroups(defaultTripId);
  }
}

export async function loadTripData(tripId: string) {
  if (!isSupabaseTripStorageConfigured()) {
    return loadLocalTripData(tripId);
  }

  try {
    const remoteData = await loadSupabaseTripData(tripId);

    if (remoteData) {
      saveLocalTripData(remoteData);
      return remoteData;
    }

    deleteLocalTripGroup(tripId);
    return createSeedTripData(tripId);
  } catch (error) {
    logSupabaseFallback(error);
    return loadLocalTripData(tripId);
  }
}

export async function saveTripData(data: TripPhase1Data) {
  saveLocalTripData(data);

  if (!isSupabaseTripStorageConfigured()) {
    return;
  }

  try {
    await saveSupabaseTripData(data);
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
  const seeded = createSeedTripData(tripId);

  await saveTripData(seeded);
  return seeded;
}

export function sortTripGroups(groups: TripGroupSummary[]) {
  return [...groups].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}
