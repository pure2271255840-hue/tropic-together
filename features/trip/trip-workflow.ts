import type { AuthUser } from "@/features/auth/types";
import type {
  ItineraryVersion,
  TripGroupSummary,
  TripMember,
  TripPhase1Data
} from "./types";

export function memberBelongsToUser(member: TripMember, user: AuthUser | null) {
  if (!user) {
    return false;
  }

  return (
    member.appUserId === user.id ||
    member.displayName.trim().toLowerCase() === user.username
  );
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

export function isJoinedTripForUser(
  group: TripGroupSummary,
  user: AuthUser | null
) {
  return group.members.some(
    (member) => member.role !== "owner" && memberBelongsToUser(member, user)
  );
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
