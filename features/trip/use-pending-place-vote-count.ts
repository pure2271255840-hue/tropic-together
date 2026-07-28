"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { localTripDataChangeEvent } from "./trip-events";
import {
  isRemoteTripStorageEnabled,
  listTripGroups,
  loadTripData
} from "./trip-storage";
import {
  getPendingPlaceVoteCount,
  isTripForUser
} from "./trip-workflow";

const remoteBadgeSyncIntervalMs = 15000;

export function usePendingPlaceVoteCount(defaultTripId: string) {
  const { user, isLoading } = useAuthSession();
  const [count, setCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    function refresh() {
      setRefreshToken((current) => current + 1);
    }

    window.addEventListener(localTripDataChangeEvent, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(localTripDataChangeEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!isRemoteTripStorageEnabled()) {
      return undefined;
    }

    function refreshWhenVisible() {
      if (document.visibilityState !== "hidden") {
        setRefreshToken((current) => current + 1);
      }
    }

    const intervalId = window.setInterval(
      refreshWhenVisible,
      remoteBadgeSyncIntervalMs
    );

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !user) {
      setCount(0);
      return undefined;
    }

    let isCancelled = false;

    async function loadPendingCount() {
      const groups = await listTripGroups(defaultTripId);
      const activeGroups = groups.filter(
        (group) =>
          isTripForUser(group, user) &&
          group.placeCount > 0 &&
          group.phase !== "final_confirmed" &&
          group.phase !== "travel_active"
      );
      const pendingCounts = await Promise.all(
        activeGroups.map(async (group) =>
          getPendingPlaceVoteCount(await loadTripData(group.id), user)
        )
      );
      const total = pendingCounts.reduce((sum, item) => sum + item, 0);

      if (!isCancelled) {
        setCount(total);
      }
    }

    void loadPendingCount();

    return () => {
      isCancelled = true;
    };
  }, [defaultTripId, isLoading, refreshToken, user]);

  return count;
}
