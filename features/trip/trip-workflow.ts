import type { AuthUser } from "@/features/auth/types";
import { tripMemberBelongsToUser } from "./access";
import type {
  ItineraryVersion,
  TripGroupSummary,
  TripMember,
  TripPhase1Data
} from "./types";

export function memberBelongsToUser(member: TripMember, user: AuthUser | null) {
  return tripMemberBelongsToUser(member, user);
}

export function isManagedItineraryVotingTrip(
  group: TripGroupSummary,
  user: AuthUser | null
) {
  return (
    group.phase === "itinerary_voting" &&
    isTripManagedByUser(group, user)
  );
}

export function isTripManagedByUser(
  group: TripGroupSummary,
  user: AuthUser | null
) {
  return group.members.some(
    (member) => member.role === "owner" && memberBelongsToUser(member, user)
  );
}

export function isTripForUser(
  group: TripGroupSummary,
  user: AuthUser | null
) {
  return group.members.some((member) => memberBelongsToUser(member, user));
}

export function isJoinedTripForUser(
  group: TripGroupSummary,
  user: AuthUser | null
) {
  return group.members.some(
    (member) => member.role !== "owner" && memberBelongsToUser(member, user)
  );
}

export function getTripMemberForUser(
  data: TripPhase1Data,
  user: AuthUser | null
) {
  return (
    data.members.find((member) => memberBelongsToUser(member, user)) ?? null
  );
}

export function getPendingPlaceVoteCount(
  data: TripPhase1Data,
  user: AuthUser | null
) {
  if (
    data.trip.phase === "final_confirmed" ||
    data.trip.phase === "travel_active"
  ) {
    return 0;
  }

  const member = getTripMemberForUser(data, user);

  if (!member) {
    return 0;
  }

  const votedPlaceIds = new Set(
    data.placeVotes
      .filter((vote) => vote.memberId === member.id)
      .map((vote) => vote.placeId)
  );

  return data.places.filter((place) => !votedPlaceIds.has(place.id)).length;
}

export function getCurrentItineraryVersion(
  versions: ItineraryVersion[],
  currentVersionId: string
) {
  return (
    versions.find((version) => version.id === currentVersionId) ?? versions[0]
  );
}

export function isJoinedItineraryVoteNeeded(
  data: TripPhase1Data,
  user: AuthUser | null
) {
  if (data.trip.phase !== "itinerary_voting") {
    return false;
  }

  const member = data.members.find(
    (candidate) =>
      candidate.role !== "owner" && memberBelongsToUser(candidate, user)
  );
  const currentVersion = getCurrentItineraryVersion(
    data.itineraryVersions,
    data.currentItineraryVersionId
  );

  return Boolean(
    member &&
      currentVersion &&
      currentVersion.status !== "final" &&
      !data.itineraryVotes.some(
        (vote) =>
          vote.versionId === currentVersion.id && vote.memberId === member.id
      )
  );
}
