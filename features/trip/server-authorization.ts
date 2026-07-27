import type { AuthUser } from "@/features/auth/types";
import { compactTripItineraryHistory, isTripPhase1Data } from "./data-shape";
import {
  loadSupabaseTripWorkspaceForAdmin,
  saveSupabaseTripWorkspaceForAdmin
} from "./supabase-trip-admin";
import { getTripMemberForUser, userCanManageTrip, userCanReadTrip } from "./access";
import type { TripPhase1Data } from "./types";

export type TripAccessResult =
  | { ok: true; data: TripPhase1Data }
  | { ok: false; status: 403 | 404; message: string };

export function validateIncomingTripData(value: unknown) {
  if (!isTripPhase1Data(value)) {
    return null;
  }

  return compactTripItineraryHistory(value);
}

export async function requireReadableTrip(
  tripId: string,
  user: AuthUser | null
): Promise<TripAccessResult> {
  const workspace = await loadSupabaseTripWorkspaceForAdmin(tripId);

  if (!workspace) {
    return {
      ok: false,
      status: 404,
      message: "没有找到这个行程。"
    };
  }

  const data = compactTripItineraryHistory(workspace.data);

  if (!userCanReadTrip(data, user)) {
    return {
      ok: false,
      status: 403,
      message: "你不是这个行程的成员。"
    };
  }

  return { ok: true, data };
}

export function canCreateTrip(data: TripPhase1Data, user: AuthUser | null) {
  const member = getTripMemberForUser(data, user);

  return member?.role === "owner";
}

function membershipSignature(data: TripPhase1Data) {
  return JSON.stringify({
    ownerMemberId: data.trip.ownerMemberId,
    members: data.members
      .map((member) => ({
        id: member.id,
        appUserId: member.appUserId,
        role: member.role
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  });
}

export async function saveAuthorizedTripData(
  incomingData: TripPhase1Data,
  user: AuthUser
): Promise<TripAccessResult> {
  const data = compactTripItineraryHistory(incomingData);
  const workspace = await loadSupabaseTripWorkspaceForAdmin(data.trip.id);

  if (!workspace) {
    if (!canCreateTrip(data, user)) {
      return {
        ok: false,
        status: 403,
        message: "只有行程发起人才能创建这个行程。"
      };
    }

    await saveSupabaseTripWorkspaceForAdmin(data);
    return { ok: true, data };
  }

  const currentData = compactTripItineraryHistory(workspace.data);
  const currentMember = getTripMemberForUser(currentData, user);

  if (!userCanReadTrip(currentData, user)) {
    return {
      ok: false,
      status: 403,
      message: "你不是这个行程的成员。"
    };
  }

  if (
    currentMember?.role !== "owner" &&
    membershipSignature(data) !== membershipSignature(currentData)
  ) {
    return {
      ok: false,
      status: 403,
      message: "普通成员不能修改行程成员或发起人。"
    };
  }

  if (currentMember?.role === "owner" && !userCanManageTrip(data, user)) {
    return {
      ok: false,
      status: 403,
      message: "保存后的行程不能移除你自己的发起人身份。"
    };
  }

  if (!userCanReadTrip(data, user)) {
    return {
      ok: false,
      status: 403,
      message: "保存后的行程不能移除你自己的成员身份。"
    };
  }

  await saveSupabaseTripWorkspaceForAdmin(data);
  return { ok: true, data };
}

export function canDeleteTrip(data: TripPhase1Data, user: AuthUser | null) {
  return userCanManageTrip(data, user);
}
