"use client";

const activeMemberPrefix = "tropic-together:active-member:";

export function activeMemberStorageKey(tripId: string) {
  return `${activeMemberPrefix}${tripId}`;
}

export function getActiveTripMemberId(tripId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(activeMemberStorageKey(tripId));
}

export function setActiveTripMemberId(tripId: string, memberId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(activeMemberStorageKey(tripId), memberId);
}
