"use client";

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload
} from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured
} from "@/features/supabase/browser-client";
import {
  compactTripItineraryHistory,
  isTripPhase1Data
} from "./data-shape";
import type { TripPhase1Data } from "./types";

type TripWorkspaceRealtimeRow = {
  id: string;
  data: TripPhase1Data;
  updated_at: string;
};

type RealtimeTokenPayload = {
  token?: string;
  expiresAt?: number;
  message?: string;
};

const realtimeTokenRefreshMs = 12 * 60 * 1000;
let realtimeSubscriptionSequence = 0;

export function isTripRealtimeConfigured() {
  return isSupabaseBrowserConfigured();
}

async function loadRealtimeToken(tripId: string) {
  const response = await fetch(
    `/api/trips/realtime-token?tripId=${encodeURIComponent(tripId)}`,
    { cache: "no-store" }
  );
  const payload = (await response.json().catch(() => ({}))) as RealtimeTokenPayload;

  if (!response.ok || !payload.token) {
    throw new Error(
      payload.message || `Realtime token request failed: ${response.status}`
    );
  }

  return payload.token;
}

function dataFromRealtimePayload(
  payload: RealtimePostgresChangesPayload<TripWorkspaceRealtimeRow>
) {
  const row = payload.new;
  const data = row && "data" in row ? row.data : null;

  return isTripPhase1Data(data) ? compactTripItineraryHistory(data) : null;
}

export function subscribeToTripWorkspace(
  tripId: string,
  onData: (data: TripPhase1Data) => void
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return () => undefined;
  }

  const realtimeClient = supabase;
  let channel: RealtimeChannel | null = null;
  let tokenRefreshId: number | null = null;
  let reconnectId: number | null = null;
  let disposed = false;

  async function refreshRealtimeAuth() {
    const token = await loadRealtimeToken(tripId);

    realtimeClient.realtime.setAuth(token);
  }

  function refreshRealtimeAuthSafely() {
    void refreshRealtimeAuth().catch((error) => {
      console.warn("Unable to refresh Supabase Realtime auth.", error);
    });
  }

  async function connect() {
    try {
      await refreshRealtimeAuth();
    } catch (error) {
      console.warn("Unable to authorize Supabase Realtime.", error);
      return;
    }

    if (disposed) {
      return;
    }

    if (tokenRefreshId) {
      window.clearInterval(tokenRefreshId);
      tokenRefreshId = null;
    }

    if (channel) {
      const staleChannel = channel;

      channel = null;
      await realtimeClient.removeChannel(staleChannel).catch((error) => {
        console.warn("Unable to remove stale Supabase Realtime channel.", error);
      });
    }

    if (disposed) {
      return;
    }

    const channelName = [
      "trip-workspace",
      tripId,
      Date.now().toString(36),
      (realtimeSubscriptionSequence += 1).toString(36)
    ].join(":");

    channel = realtimeClient
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_phase1_workspaces",
          filter: `id=eq.${tripId}`
        },
        (payload) => {
          const data = dataFromRealtimePayload(
            payload as RealtimePostgresChangesPayload<TripWorkspaceRealtimeRow>
          );

          if (data) {
            onData(data);
          }
        }
      )
      .subscribe((status) => {
        if (
          !disposed &&
          (status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED")
        ) {
          if (reconnectId) {
            window.clearTimeout(reconnectId);
          }

          reconnectId = window.setTimeout(() => {
            if (!disposed) {
              void connect();
            }
          }, 3000);
        }
      });

    tokenRefreshId = window.setInterval(
      refreshRealtimeAuthSafely,
      realtimeTokenRefreshMs
    );
  }

  void connect();

  return () => {
    disposed = true;

    if (tokenRefreshId) {
      window.clearInterval(tokenRefreshId);
    }

    if (reconnectId) {
      window.clearTimeout(reconnectId);
    }

    if (channel) {
      void realtimeClient.removeChannel(channel);
    }
  };
}
