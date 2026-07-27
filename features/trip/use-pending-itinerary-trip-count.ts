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
  isJoinedItineraryVoteNeeded,
  isJoinedTripForUser,
  isManagedItineraryVotingTrip
} from "./trip-workflow";

const remoteBadgeSyncIntervalMs = 15000;

export function usePendingItineraryTripCount(defaultTripId: string) {
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
      const managedCount = groups.filter((group) =>
        isManagedItineraryVotingTrip(group, user)
      ).length;
      const joinedGroups = groups.filter(
        (group) =>
          group.phase === "itinerary_voting" &&
          isJoinedTripForUser(group, user)
      );
      const joinedVoteStates = await Promise.all(
        joinedGroups.map(async (group) =>
          isJoinedItineraryVoteNeeded(await loadTripData(group.id), user)
        )
      );
      const joinedCount = joinedVoteStates.filter(Boolean).length;

      if (!isCancelled) {
        setCount(managedCount + joinedCount);
      }
    }

    void loadPendingCount();

    return () => {
      isCancelled = true;
    };
  }, [defaultTripId, isLoading, refreshToken, user]);

  return count;
}
