"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addAiItineraryDraftToTrip,
  addItineraryDayToTrip,
  addItineraryItemToTrip,
  addPlaceToTrip,
  cancelFinalItineraryVersionInTrip,
  confirmItineraryVersionInTrip,
  deleteItineraryDaysFromTrip,
  deleteItineraryItemFromTrip,
  deletePlaceFromTrip,
  setItineraryItemLockedInTrip,
  setItineraryItemsLockedInDateRange as setItineraryItemsLockedInDateRangeInTrip,
  setItineraryVoteInTrip,
  setPlaceVoteInTrip,
  updateItineraryDayInTrip,
  updateItineraryItemInTrip,
  updatePlaceInTrip,
  updateTripSettingsInTrip
} from "./local-storage-adapter";
import {
  getActiveTripMemberId,
  setActiveTripMemberId
} from "./active-member";
import { createSeedTripData } from "./seed-data";
import { localTripDataChangeEvent } from "./trip-events";
import {
  isTripRealtimeConfigured,
  subscribeToTripWorkspace
} from "./trip-realtime";
import {
  isRemoteTripStorageEnabled,
  loadRemoteTripData,
  loadTripData,
  resetTripData,
  saveTripData
} from "./trip-storage";
import type {
  AiItineraryDraft,
  ItineraryDayInput,
  ItineraryItemInput,
  ItineraryVoteValue,
  PlaceInput,
  PlaceVoteValue,
  TripSettingsInput,
  TripPhase1Data
} from "./types";

type TripProducer = (current: TripPhase1Data) => TripPhase1Data;

type LocalTripDataChangeDetail = {
  tripId: string;
  data: TripPhase1Data;
};

const remoteSyncIntervalMs = 10000;

function notifyLocalTripDataChanged(data: TripPhase1Data) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<LocalTripDataChangeDetail>(localTripDataChangeEvent, {
      detail: {
        tripId: data.trip.id,
        data
      }
    })
  );
}

function withActiveTripMember(data: TripPhase1Data) {
  const activeMemberId = getActiveTripMemberId(data.trip.id);

  if (
    activeMemberId &&
    data.members.some((member) => member.id === activeMemberId)
  ) {
    return { ...data, currentMemberId: activeMemberId };
  }

  return data;
}

export function useLocalTripStore(tripId: string) {
  const [data, setData] = useState<TripPhase1Data>(() =>
    createSeedTripData(tripId)
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const pendingCommitRef = useRef<TripPhase1Data | null>(null);
  const latestDataRef = useRef(data);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const applyRemoteTripData = useCallback((remoteData: TripPhase1Data) => {
    if (pendingCommitRef.current) {
      return;
    }

    const currentData = latestDataRef.current;

    if (remoteData.updatedAt <= currentData.updatedAt) {
      return;
    }

    const nextData = withActiveTripMember(remoteData);

    latestDataRef.current = nextData;
    setData(nextData);
    setIsLoaded(true);
    notifyLocalTripDataChanged(nextData);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    setIsLoaded(false);
    void loadTripData(tripId).then((next) => {
      if (!isCancelled) {
        const nextData = withActiveTripMember(next);

        latestDataRef.current = nextData;
        setData(nextData);
        setIsLoaded(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    function handleLocalTripDataChange(event: Event) {
      const detail = (event as CustomEvent<LocalTripDataChangeDetail>).detail;

      if (detail?.tripId === tripId) {
        const nextData = withActiveTripMember(detail.data);

        latestDataRef.current = nextData;
        setData(nextData);
        setIsLoaded(true);
      }
    }

    function handleStorageChange() {
      void loadTripData(tripId).then((next) => {
        const nextData = withActiveTripMember(next);

        latestDataRef.current = nextData;
        setData(nextData);
        setIsLoaded(true);
      });
    }

    window.addEventListener(localTripDataChangeEvent, handleLocalTripDataChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        localTripDataChangeEvent,
        handleLocalTripDataChange
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [tripId]);

  useEffect(() => {
    if (!isLoaded || !isRemoteTripStorageEnabled()) {
      return undefined;
    }

    let isCancelled = false;

    async function syncRemoteTripData() {
      if (document.visibilityState === "hidden") {
        return;
      }

      const remoteData = await loadRemoteTripData(tripId);

      if (!remoteData || isCancelled) {
        return;
      }

      applyRemoteTripData(remoteData);
    }

    function syncVisibleRemoteTripData() {
      if (document.visibilityState !== "hidden") {
        void syncRemoteTripData();
      }
    }

    const intervalId = window.setInterval(
      () => void syncRemoteTripData(),
      remoteSyncIntervalMs
    );

    window.addEventListener("focus", syncVisibleRemoteTripData);
    document.addEventListener("visibilitychange", syncVisibleRemoteTripData);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncVisibleRemoteTripData);
      document.removeEventListener("visibilitychange", syncVisibleRemoteTripData);
    };
  }, [applyRemoteTripData, isLoaded, tripId]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isRemoteTripStorageEnabled() ||
      !isTripRealtimeConfigured()
    ) {
      return undefined;
    }

    return subscribeToTripWorkspace(tripId, applyRemoteTripData);
  }, [applyRemoteTripData, isLoaded, tripId]);

  const commit = useCallback((producer: TripProducer) => {
    setData((current) => {
      const next = producer(current);

      pendingCommitRef.current = next;
      latestDataRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const pendingCommit = pendingCommitRef.current;

    if (!pendingCommit || pendingCommit !== data) {
      return;
    }

    pendingCommitRef.current = null;
    void saveTripData(pendingCommit);
    notifyLocalTripDataChanged(pendingCommit);
  }, [data]);

  const actions = useMemo(
    () => ({
      setCurrentMember(memberId: string) {
        setActiveTripMemberId(tripId, memberId);
        commit((current) => ({ ...current, currentMemberId: memberId }));
      },
      updateTripSettings(input: TripSettingsInput) {
        commit((current) => updateTripSettingsInTrip(current, input));
      },
      addPlace(input: PlaceInput) {
        commit((current) => addPlaceToTrip(current, input));
      },
      updatePlace(placeId: string, input: PlaceInput) {
        commit((current) => updatePlaceInTrip(current, placeId, input));
      },
      deletePlace(placeId: string) {
        commit((current) => deletePlaceFromTrip(current, placeId));
      },
      setPlaceVote(
        placeId: string,
        memberId: string,
        value: PlaceVoteValue,
        reason: string
      ) {
        commit((current) =>
          setPlaceVoteInTrip(current, placeId, memberId, value, reason)
        );
      },
      addItineraryItem(input: ItineraryItemInput) {
        commit((current) => addItineraryItemToTrip(current, input));
      },
      addItineraryDay(input: ItineraryDayInput) {
        commit((current) => addItineraryDayToTrip(current, input));
      },
      addAiItineraryDraft(input: AiItineraryDraft) {
        commit((current) => addAiItineraryDraftToTrip(current, input));
      },
      updateItineraryDay(input: ItineraryDayInput & { dayId: string }) {
        commit((current) => updateItineraryDayInTrip(current, input));
      },
      deleteItineraryDays(versionId: string, dayIds: string[]) {
        commit((current) =>
          deleteItineraryDaysFromTrip(current, versionId, dayIds)
        );
      },
      updateItineraryItem(input: ItineraryItemInput & { itemId: string }) {
        commit((current) => updateItineraryItemInTrip(current, input));
      },
      deleteItineraryItem(versionId: string, itemId: string) {
        commit((current) =>
          deleteItineraryItemFromTrip(current, versionId, itemId)
        );
      },
      setItineraryItemLocked(
        versionId: string,
        itemId: string,
        isLocked: boolean
      ) {
        commit((current) =>
          setItineraryItemLockedInTrip(current, versionId, itemId, isLocked)
        );
      },
      setItineraryItemsLockedInDateRange(
        versionId: string,
        startDate: string,
        endDate: string,
        isLocked: boolean
      ) {
        commit((current) =>
          setItineraryItemsLockedInDateRangeInTrip(
            current,
            versionId,
            startDate,
            endDate,
            isLocked
          )
        );
      },
      setItineraryVote(
        versionId: string,
        memberId: string,
        value: ItineraryVoteValue,
        reason: string
      ) {
        commit((current) =>
          setItineraryVoteInTrip(current, versionId, memberId, value, reason)
        );
      },
      confirmItineraryVersion(versionId: string) {
        commit((current) => confirmItineraryVersionInTrip(current, versionId));
      },
      cancelFinalItineraryVersion(versionId: string) {
        commit((current) =>
          cancelFinalItineraryVersionInTrip(current, versionId)
        );
      },
      reset() {
        const next = resetTripData(tripId);

        notifyLocalTripDataChanged(next);
        latestDataRef.current = next;
        setData(next);
      }
    }),
    [commit, tripId]
  );

  return { data, isLoaded, actions };
}
