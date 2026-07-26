"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  updatePlaceInTrip
} from "./local-storage-adapter";
import { createSeedTripData } from "./seed-data";
import { loadTripData, resetTripData, saveTripData } from "./trip-storage";
import type {
  ItineraryDayInput,
  ItineraryItemInput,
  ItineraryVoteValue,
  PlaceInput,
  PlaceVoteValue,
  TripPhase1Data
} from "./types";

type TripProducer = (current: TripPhase1Data) => TripPhase1Data;
const localTripDataChangeEvent = "tropic-together:local-trip-data-change";

type LocalTripDataChangeDetail = {
  tripId: string;
  data: TripPhase1Data;
};

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

export function useLocalTripStore(tripId: string) {
  const [data, setData] = useState<TripPhase1Data>(() =>
    createSeedTripData(tripId)
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    setIsLoaded(false);
    void loadTripData(tripId).then((next) => {
      if (!isCancelled) {
        setData(next);
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
        setData(detail.data);
        setIsLoaded(true);
      }
    }

    function handleStorageChange() {
      void loadTripData(tripId).then((next) => {
        setData(next);
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

  const commit = useCallback((producer: TripProducer) => {
    setData((current) => {
      const next = producer(current);
      void saveTripData(next);
      notifyLocalTripDataChanged(next);
      return next;
    });
  }, []);

  const actions = useMemo(
    () => ({
      setCurrentMember(memberId: string) {
        commit((current) => ({ ...current, currentMemberId: memberId }));
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
        setData(next);
      }
    }),
    [commit, tripId]
  );

  return { data, isLoaded, actions };
}
