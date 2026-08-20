import type { TripGroupSummary, TripPhase1Data } from "./types";
import { contributingMemberIdsForTrip } from "./member-actions";

function normalizePlaceLocationStatus(
  place: TripPhase1Data["places"][number]
) {
  const hasCoordinate = Boolean(place.coordinate);
  const coordinateSource =
    place.coordinateSource ??
    (place.poiId
      ? "amap_poi"
      : place.mapUrl && hasCoordinate
        ? "map_url"
        : "manual");
  const locationStatus =
    place.locationStatus ?? (place.poiId ? "verified" : "needs_confirmation");

  return {
    ...place,
    officialName: place.officialName?.trim() || undefined,
    activityTitle: place.activityTitle?.trim() || undefined,
    coordinateSource,
    locationStatus
  };
}

function normalizeTripData(data: TripPhase1Data) {
  return {
    ...data,
    places: data.places.map(normalizePlaceLocationStatus)
  };
}

export function cloneData(data: TripPhase1Data): TripPhase1Data {
  return JSON.parse(JSON.stringify(data)) as TripPhase1Data;
}

export function compactTripItineraryHistory(data: TripPhase1Data): TripPhase1Data {
  const next = normalizeTripData(cloneData(data));
  const currentVersion =
    next.itineraryVersions.find(
      (version) => version.id === next.currentItineraryVersionId
    ) ?? next.itineraryVersions[0];

  if (!currentVersion) {
    next.currentItineraryVersionId = "";
    next.itineraryVersions = [];
    next.itineraryVotes = [];
    return next;
  }

  next.currentItineraryVersionId = currentVersion.id;
  next.itineraryVersions = [currentVersion];
  next.itineraryVotes = next.itineraryVotes.filter(
    (vote) => vote.versionId === currentVersion.id
  );

  return next;
}

export function summarizeTripGroup(data: TripPhase1Data): TripGroupSummary {
  const currentData = compactTripItineraryHistory(data);

  return {
    id: currentData.trip.id,
    name: currentData.trip.name,
    subtitle: currentData.trip.subtitle,
    startDate: currentData.trip.startDate,
    endDate: currentData.trip.endDate,
    phase: currentData.trip.phase,
    inviteCode: currentData.trip.inviteCode,
    inviteUrl: currentData.trip.inviteUrl,
    members: currentData.members,
    contributingMemberIds: contributingMemberIdsForTrip(currentData),
    placeCount: currentData.places.length,
    updatedAt: currentData.updatedAt
  };
}

export function isTripPhase1Data(value: unknown): value is TripPhase1Data {
  const candidate = value as TripPhase1Data | undefined;

  return Boolean(
    candidate?.trip?.id &&
      candidate.trip.phase &&
      Array.isArray(candidate.members) &&
      Array.isArray(candidate.places) &&
      Array.isArray(candidate.itineraryVersions) &&
      Array.isArray(candidate.placeVotes) &&
      Array.isArray(candidate.itineraryVotes) &&
      typeof candidate.updatedAt === "string"
  );
}
