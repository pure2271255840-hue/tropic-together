"use client";

import type { TripGroupSummary } from "./types";

const cachePrefix = "tropic-together:trip-groups:";

type CachedTripGroups = {
  version: 1;
  groups: TripGroupSummary[];
};

function cacheKey(userId: string) {
  return `${cachePrefix}${userId}`;
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function readCachedTripGroups(userId: string) {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(cacheKey(userId));

  if (!rawValue) {
    return null;
  }

  try {
    const cached = JSON.parse(rawValue) as CachedTripGroups;

    return cached.version === 1 && Array.isArray(cached.groups)
      ? cached.groups
      : null;
  } catch {
    window.sessionStorage.removeItem(cacheKey(userId));
    return null;
  }
}

export function writeCachedTripGroups(
  userId: string,
  groups: TripGroupSummary[]
) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    cacheKey(userId),
    JSON.stringify({ version: 1, groups })
  );
}
