import type { AuthUser } from "@/features/auth/types";
import { compactTripItineraryHistory, isTripPhase1Data } from "./data-shape";
import {
  loadSupabaseTripWorkspaceForAdmin,
  saveSupabaseTripWorkspaceForAdmin
} from "./supabase-trip-admin";
import { getTripMemberForUser, userCanManageTrip, userCanReadTrip } from "./access";
import {
  memberDisplayNameExists,
  memberHasTripContributions
} from "./member-actions";
import { isTripContentLocked } from "./trip-lock";
import type { TripMember, TripPhase1Data } from "./types";

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

function memberSignature(member: TripMember) {
  return JSON.stringify({
    id: member.id,
    appUserId: member.appUserId ?? "",
    role: member.role,
    color: member.color
  });
}

function membersExactSignature(members: TripMember[]) {
  return JSON.stringify(
    members
      .map((member) => ({
        id: member.id,
        appUserId: member.appUserId ?? "",
        displayName: member.displayName,
        role: member.role,
        color: member.color
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  );
}

function tripDataExceptMembershipSignature(data: TripPhase1Data) {
  return JSON.stringify({
    ...data,
    currentMemberId: "",
    members: [],
    updatedAt: ""
  });
}

function tripContentSignature(data: TripPhase1Data) {
  return JSON.stringify({
    trip: data.trip,
    places: data.places,
    placeVotes: data.placeVotes,
    itineraryVersions: data.itineraryVersions,
    currentItineraryVersionId: data.currentItineraryVersionId,
    itineraryVotes: data.itineraryVotes
  });
}

function currentMemberCanLeaveTrip(
  currentData: TripPhase1Data,
  nextData: TripPhase1Data,
  currentMember: TripMember
) {
  if (
    currentMember.role === "owner" ||
    memberHasTripContributions(currentData, currentMember.id) ||
    tripDataExceptMembershipSignature(currentData) !==
      tripDataExceptMembershipSignature(nextData)
  ) {
    return false;
  }

  const expectedMembers = currentData.members.filter(
    (member) => member.id !== currentMember.id
  );
  const nextCurrentMemberIsValid =
    !nextData.currentMemberId ||
    nextData.members.some((member) => member.id === nextData.currentMemberId);

  return (
    nextCurrentMemberIsValid &&
    membersExactSignature(expectedMembers) ===
      membersExactSignature(nextData.members)
  );
}

function memberChangeErrorForMember(
  currentData: TripPhase1Data,
  nextData: TripPhase1Data,
  currentMember: TripMember
) {
  if (nextData.trip.ownerMemberId !== currentData.trip.ownerMemberId) {
    return "普通成员不能修改行程发起人。";
  }

  if (nextData.members.length !== currentData.members.length) {
    return "普通成员不能修改行程成员。";
  }

  const nextMembersById = new Map(
    nextData.members.map((member) => [member.id, member])
  );

  for (const current of currentData.members) {
    const next = nextMembersById.get(current.id);

    if (!next || memberSignature(next) !== memberSignature(current)) {
      return "普通成员不能修改行程成员。";
    }

    if (
      current.id !== currentMember.id &&
      next.displayName !== current.displayName
    ) {
      return "只能修改自己在这个行程里的昵称。";
    }
  }

  const nextCurrentMember = nextMembersById.get(currentMember.id);

  if (
    nextCurrentMember &&
    nextCurrentMember.displayName !== currentMember.displayName
  ) {
    const displayName = nextCurrentMember.displayName.trim();

    if (!displayName || displayName.length > 24) {
      return "行程昵称长度需要在 1-24 位之间。";
    }

    if (memberDisplayNameExists(nextData.members, displayName, currentMember.id)) {
      return "这个昵称在当前行程里已经有人用了，请换一个。";
    }
  }

  return null;
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

  if (!currentMember || !userCanReadTrip(currentData, user)) {
    return {
      ok: false,
      status: 403,
      message: "你不是这个行程的成员。"
    };
  }

  if (currentMember.role !== "owner") {
    if (currentMemberCanLeaveTrip(currentData, data, currentMember)) {
      await saveSupabaseTripWorkspaceForAdmin(data);
      return { ok: true, data };
    }

    const memberChangeError = memberChangeErrorForMember(
      currentData,
      data,
      currentMember
    );

    if (memberChangeError) {
      return {
        ok: false,
        status: 403,
        message: memberChangeError
      };
    }
  }

  if (
    isTripContentLocked(currentData.trip.phase) &&
    tripContentSignature(data) !== tripContentSignature(currentData)
  ) {
    return {
      ok: false,
      status: 403,
      message: "最终版已确认，不能再修改地点或行程。"
    };
  }

  if (currentMember.role === "owner" && !userCanManageTrip(data, user)) {
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
