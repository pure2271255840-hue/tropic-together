import type { AuthUser } from "@/features/auth/types";
import { getTripMemberForUser } from "./access";
import type { TripMember, TripPhase1Data } from "./types";

function normalizedName(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function memberMatchesLegacyAccount(member: TripMember, user: AuthUser | null) {
  if (!user || member.appUserId) {
    return false;
  }

  const memberName = normalizedName(member.displayName);
  const accountNames = [
    normalizedName(user.displayName),
    normalizedName(user.username)
  ].filter(Boolean);

  return Boolean(memberName && accountNames.includes(memberName));
}

function ownerMember(data: TripPhase1Data) {
  return (
    data.members.find((member) => member.id === data.trip.ownerMemberId) ??
    data.members.find((member) => member.role === "owner")
  );
}

export function resolveCurrentTripMember(
  data: TripPhase1Data,
  user: AuthUser | null
) {
  const exactMember = getTripMemberForUser(data, user);
  const owner = ownerMember(data);
  const legacyOwner =
    owner && memberMatchesLegacyAccount(owner, user) ? owner : undefined;

  return (
    legacyOwner ??
    exactMember ??
    data.members.find((member) => member.id === data.currentMemberId) ??
    data.members[0]
  );
}

export function tripGroupHasLegacyOwnerForUser(
  members: TripMember[],
  user: AuthUser | null
) {
  return members.some(
    (member) => member.role === "owner" && memberMatchesLegacyAccount(member, user)
  );
}
