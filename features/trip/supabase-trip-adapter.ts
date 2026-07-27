"use client";

import { compactTripItineraryHistory } from "./data-shape";
import type { TripGroupSummary, TripPhase1Data } from "./types";

type TripListPayload = {
  groups?: TripGroupSummary[];
  message?: string;
};

type TripDataPayload = {
  data: TripPhase1Data;
  message?: string;
};

export function isSupabaseTripStorageConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

async function parseTripApiResponse<T extends { message?: string }>(
  response: Response
): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    throw new Error(payload.message || `Trip request failed: ${response.status}`);
  }

  return payload;
}

export async function listSupabaseTripGroups(): Promise<TripGroupSummary[]> {
  const payload = await parseTripApiResponse<TripListPayload>(
    await fetch("/api/trips/workspaces", { cache: "no-store" })
  );

  return payload.groups ?? [];
}

export async function loadSupabaseTripData(
  tripId: string
): Promise<TripPhase1Data | null> {
  const response = await fetch(
    `/api/trips/workspaces/${encodeURIComponent(tripId)}`,
    { cache: "no-store" }
  );

  if (response.status === 403 || response.status === 404) {
    return null;
  }

  const payload = await parseTripApiResponse<TripDataPayload>(response);

  return payload.data ? compactTripItineraryHistory(payload.data) : null;
}

export async function saveSupabaseTripData(data: TripPhase1Data) {
  const compactedData = compactTripItineraryHistory(data);

  await parseTripApiResponse<TripDataPayload>(await fetch("/api/trips/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: compactedData })
  }));
}

export async function deleteSupabaseTripData(tripId: string) {
  await parseTripApiResponse<{ ok?: boolean; message?: string }>(
    await fetch(`/api/trips/workspaces/${encodeURIComponent(tripId)}`, {
      method: "DELETE"
    })
  );
}
