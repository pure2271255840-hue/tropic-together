import type { TripMember, TripPhase1Data } from "./types";

function cloneTripData(data: TripPhase1Data): TripPhase1Data {
  return JSON.parse(JSON.stringify(data)) as TripPhase1Data;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizedName(value: string) {
  return value.trim().toLowerCase();
}

export function memberHasTripContributions(
  data: TripPhase1Data,
  memberId: string
) {
  return (
    data.places.some((place) => place.addedByMemberId === memberId) ||
    data.placeVotes.some((vote) => vote.memberId === memberId) ||
    data.itineraryVotes.some((vote) => vote.memberId === memberId) ||
    data.itineraryVersions.some(
      (version) =>
        version.createdByMemberId === memberId ||
        version.days.some(
          (day) =>
            day.createdByMemberId === memberId ||
            day.items.some((item) => item.createdByMemberId === memberId)
        )
    )
  );
}

export function contributingMemberIdsForTrip(data: TripPhase1Data) {
  const memberIds = new Set<string>();

  data.places.forEach((place) => memberIds.add(place.addedByMemberId));
  data.placeVotes.forEach((vote) => memberIds.add(vote.memberId));
  data.itineraryVotes.forEach((vote) => memberIds.add(vote.memberId));
  data.itineraryVersions.forEach((version) => {
    memberIds.add(version.createdByMemberId);
    version.days.forEach((day) => {
      if (day.createdByMemberId) {
        memberIds.add(day.createdByMemberId);
      }

      day.items.forEach((item) => {
        if (item.createdByMemberId) {
          memberIds.add(item.createdByMemberId);
        }
      });
    });
  });

  return Array.from(memberIds);
}

export function memberDisplayNameExists(
  members: TripMember[],
  displayName: string,
  exceptMemberId?: string
) {
  const nextName = normalizedName(displayName);

  return members.some(
    (member) =>
      member.id !== exceptMemberId &&
      normalizedName(member.displayName) === nextName
  );
}

export function renameTripMemberInTrip(
  data: TripPhase1Data,
  memberId: string,
  displayName: string
) {
  const next = cloneTripData(data);
  const nextDisplayName = displayName.trim();

  next.members = next.members.map((member) =>
    member.id === memberId
      ? {
          ...member,
          displayName: nextDisplayName
        }
      : member
  );
  next.updatedAt = nowIso();

  return next;
}

export function removeTripMemberFromTrip(
  data: TripPhase1Data,
  memberId: string
) {
  const next = cloneTripData(data);
  const member = next.members.find((candidate) => candidate.id === memberId);

  if (!member || member.role === "owner") {
    return next;
  }

  next.members = next.members.filter((candidate) => candidate.id !== memberId);

  if (next.currentMemberId === memberId) {
    next.currentMemberId =
      next.members.find((candidate) => candidate.id === next.trip.ownerMemberId)
        ?.id ??
      next.members[0]?.id ??
      "";
  }

  next.updatedAt = nowIso();

  return next;
}
