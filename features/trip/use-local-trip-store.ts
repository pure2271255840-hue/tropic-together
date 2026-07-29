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
import { isTripContentLocked } from "./trip-lock";
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

function whenContentEditable(
  producer: TripProducer
): TripProducer {
  return (current) =>
    isTripContentLocked(current.trip.phase) ? current : producer(current);
}

function currentMemberCanCancelFinalVersion(data: TripPhase1Data) {
  return (
    data.trip.phase === "final_confirmed" &&
    data.members.find((member) => member.id === data.currentMemberId)?.role ===
      "owner"
  );
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
        setData((current) => {
          if (current.currentMemberId === memberId) {
            return current;
          }

          const next = { ...current, currentMemberId: memberId };

          latestDataRef.current = next;
          return next;
        });
      },
      updateTripSettings(input: TripSettingsInput) {
        commit(whenContentEditable((current) => updateTripSettingsInTrip(current, input)));
      },
      addPlace(input: PlaceInput) {
        commit(whenContentEditable((current) => addPlaceToTrip(current, input)));
      },
      updatePlace(placeId: string, input: PlaceInput) {
        commit(
          whenContentEditable((current) => updatePlaceInTrip(current, placeId, input))
        );
      },
      deletePlace(placeId: string) {
        commit(whenContentEditable((current) => deletePlaceFromTrip(current, placeId)));
      },
      setPlaceVote(
        placeId: string,
        memberId: string,
        value: PlaceVoteValue,
        reason: string
      ) {
        commit(
          whenContentEditable((current) =>
            setPlaceVoteInTrip(current, placeId, memberId, value, reason)
          )
        );
      },
      addItineraryItem(input: ItineraryItemInput) {
        commit(whenContentEditable((current) => addItineraryItemToTrip(current, input)));
      },
      addItineraryDay(input: ItineraryDayInput) {
        commit(whenContentEditable((current) => addItineraryDayToTrip(current, input)));
      },
      addAiItineraryDraft(input: AiItineraryDraft) {
        commit(whenContentEditable((current) => addAiItineraryDraftToTrip(current, input)));
      },
      updateItineraryDay(input: ItineraryDayInput & { dayId: string }) {
        commit(whenContentEditable((current) => updateItineraryDayInTrip(current, input)));
      },
      deleteItineraryDays(versionId: string, dayIds: string[]) {
        commit(
          whenContentEditable((current) =>
            deleteItineraryDaysFromTrip(current, versionId, dayIds)
          )
        );
      },
      updateItineraryItem(input: ItineraryItemInput & { itemId: string }) {
        commit(whenContentEditable((current) => updateItineraryItemInTrip(current, input)));
      },
      deleteItineraryItem(versionId: string, itemId: string) {
        commit(
          whenContentEditable((current) =>
            deleteItineraryItemFromTrip(current, versionId, itemId)
          )
        );
      },
      setItineraryItemLocked(
        versionId: string,
        itemId: string,
        isLocked: boolean
      ) {
        commit(
          whenContentEditable((current) =>
            setItineraryItemLockedInTrip(current, versionId, itemId, isLocked)
          )
        );
      },
      setItineraryItemsLockedInDateRange(
        versionId: string,
        startDate: string,
        endDate: string,
        isLocked: boolean
      ) {
        commit(
          whenContentEditable((current) =>
            setItineraryItemsLockedInDateRangeInTrip(
              current,
              versionId,
              startDate,
              endDate,
              isLocked
            )
          )
        );
      },
      setItineraryVote(
        versionId: string,
        memberId: string,
        value: ItineraryVoteValue,
        reason: string
      ) {
        commit(
          whenContentEditable((current) =>
            setItineraryVoteInTrip(current, versionId, memberId, value, reason)
          )
        );
      },
      confirmItineraryVersion(versionId: string) {
        commit(
          whenContentEditable((current) =>
            confirmItineraryVersionInTrip(current, versionId)
          )
        );
      },
      cancelFinalItineraryVersion(versionId: string) {
        commit((current) =>
          isTripContentLocked(current.trip.phase) &&
          !currentMemberCanCancelFinalVersion(current)
            ? current
            : cancelFinalItineraryVersionInTrip(current, versionId)
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
