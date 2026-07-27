import type { AuthUser } from "@/features/auth/types";
import type { TripMember, TripPhase1Data } from "./types";

export function tripMemberBelongsToUser(
  member: TripMember,
  user: AuthUser | null
) {
  if (!user) {
    return false;
  }

  return member.appUserId === user.id;
}

export function getTripMemberForUser(
  data: TripPhase1Data,
  user: AuthUser | null
) {
  return data.members.find((member) => tripMemberBelongsToUser(member, user));
}

export function userCanReadTrip(data: TripPhase1Data, user: AuthUser | null) {
  return Boolean(getTripMemberForUser(data, user));
}

export function userCanManageTrip(data: TripPhase1Data, user: AuthUser | null) {
  const member = getTripMemberForUser(data, user);

  return member?.role === "owner";
}
