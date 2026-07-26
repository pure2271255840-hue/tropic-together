"use client";

import { summarizeTripGroup } from "./local-storage-adapter";
import type { TripGroupSummary, TripPhase1Data } from "./types";

const tableName = "trip_phase1_workspaces";

type TripWorkspaceRow = {
  id: string;
  data: TripPhase1Data;
  updated_at: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return url && key ? { url, key } : null;
}

function restUrl(path = "") {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  return `${config.url}/rest/v1/${tableName}${path}`;
}

function requestHeaders(prefer?: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  return {
    apikey: config.key,
    ...(config.key.startsWith("eyJ")
      ? { Authorization: `Bearer ${config.key}` }
      : {}),
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

function isTripPhase1Data(value: unknown): value is TripPhase1Data {
  const candidate = value as TripPhase1Data | undefined;

  return Boolean(
    candidate?.trip?.id &&
      candidate.trip.phase &&
      Array.isArray(candidate.members) &&
      Array.isArray(candidate.places) &&
      Array.isArray(candidate.itineraryVersions)
  );
}

async function parseSupabaseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();

    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function isSupabaseTripStorageConfigured() {
  return Boolean(getSupabaseConfig());
}

export async function listSupabaseTripGroups(): Promise<TripGroupSummary[]> {
  const url = restUrl("?select=id,data,updated_at&order=updated_at.desc");
  const headers = requestHeaders();

  if (!url || !headers) {
    return [];
  }

  const rows = await parseSupabaseResponse<TripWorkspaceRow[]>(
    await fetch(url, {
      headers,
      cache: "no-store"
    })
  );

  return rows
    .filter((row) => isTripPhase1Data(row.data))
    .map((row) => summarizeTripGroup(row.data));
}

export async function loadSupabaseTripData(
  tripId: string
): Promise<TripPhase1Data | null> {
  const url = restUrl(
    `?select=id,data,updated_at&id=eq.${encodeURIComponent(tripId)}&limit=1`
  );
  const headers = requestHeaders();

  if (!url || !headers) {
    return null;
  }

  const rows = await parseSupabaseResponse<TripWorkspaceRow[]>(
    await fetch(url, {
      headers,
      cache: "no-store"
    })
  );
  const data = rows[0]?.data;

  return isTripPhase1Data(data) ? data : null;
}

export async function saveSupabaseTripData(data: TripPhase1Data) {
  const url = restUrl("?on_conflict=id");
  const headers = requestHeaders("resolution=merge-duplicates,return=minimal");

  if (!url || !headers) {
    return;
  }

  await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: data.trip.id,
      data,
      updated_at: data.updatedAt
    })
  }).then((response) =>
    response.ok
      ? undefined
      : response.text().then((message) => {
          throw new Error(message || `Supabase save failed: ${response.status}`);
        })
  );
}

export async function deleteSupabaseTripData(tripId: string) {
  const url = restUrl(`?id=eq.${encodeURIComponent(tripId)}`);
  const headers = requestHeaders("return=minimal");

  if (!url || !headers) {
    return;
  }

  await fetch(url, {
    method: "DELETE",
    headers
  }).then((response) =>
    response.ok
      ? undefined
      : response.text().then((message) => {
          throw new Error(
            message || `Supabase delete failed: ${response.status}`
          );
        })
  );
}
