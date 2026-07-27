import {
  encodeFilterValue,
  supabaseAdminRequest
} from "@/features/supabase/server-admin";
import type { TripPhase1Data } from "./types";

type TripWorkspaceRow = {
  id: string;
  data: TripPhase1Data;
  updated_at: string;
};

export async function listSupabaseTripWorkspacesForAdmin() {
  return supabaseAdminRequest<TripWorkspaceRow[]>(
    "trip_phase1_workspaces",
    "?select=id,data,updated_at&order=updated_at.desc"
  );
}

export async function saveSupabaseTripWorkspaceForAdmin(data: TripPhase1Data) {
  await supabaseAdminRequest<undefined>(
    "trip_phase1_workspaces",
    "?on_conflict=id",
    {
      method: "POST",
      body: JSON.stringify({
        id: data.trip.id,
        data,
        updated_at: data.updatedAt
      })
    },
    "resolution=merge-duplicates,return=minimal"
  );
}

export async function loadSupabaseTripWorkspaceForAdmin(tripId: string) {
  const rows = await supabaseAdminRequest<TripWorkspaceRow[]>(
    "trip_phase1_workspaces",
    `?select=id,data,updated_at&id=eq.${encodeFilterValue(tripId)}&limit=1`
  );

  return rows[0] ?? null;
}

export async function deleteSupabaseTripWorkspaceForAdmin(tripId: string) {
  await supabaseAdminRequest<undefined>(
    "trip_phase1_workspaces",
    `?id=eq.${encodeFilterValue(tripId)}`,
    { method: "DELETE" },
    "return=minimal"
  );
}
