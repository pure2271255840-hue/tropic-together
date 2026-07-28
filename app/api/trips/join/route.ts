import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthenticatedUser } from "@/features/auth/server";
import { normalizeInviteCode } from "@/features/trip/invite-code";
import {
  listSupabaseTripWorkspacesForAdmin,
  saveSupabaseTripWorkspaceForAdmin
} from "@/features/trip/supabase-trip-admin";
import type { TripMember, TripPhase1Data } from "@/features/trip/types";

export const runtime = "nodejs";

const memberColors: TripMember["color"][] = ["teal", "coral", "sunset", "leaf"];

function inviteCodeForTrip(data: TripPhase1Data) {
  if (data.trip.inviteCode) {
    return normalizeInviteCode(data.trip.inviteCode);
  }

  const inviteUrlCode = normalizeInviteCode(data.trip.inviteUrl);

  return inviteUrlCode || normalizeInviteCode(data.trip.id);
}

function findTripByInviteCode(
  workspaces: Array<{ data: TripPhase1Data }>,
  inviteCode: string
) {
  return workspaces.find((workspace) => {
    const data = workspace.data;

    return (
      inviteCodeForTrip(data) === inviteCode ||
      normalizeInviteCode(data.trip.id) === inviteCode
    );
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号，再加入行程。" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      inviteCode?: string;
      displayName?: string;
    };
    const inviteCode = normalizeInviteCode(body.inviteCode ?? "");
    const displayName = (
      body.displayName?.trim() ||
      user.displayName ||
      user.username
    ).trim();

    if (!inviteCode) {
      return NextResponse.json(
        { message: "请输入邀请码。" },
        { status: 400 }
      );
    }

    if (!displayName || displayName.length > 24) {
      return NextResponse.json(
        { message: "行程昵称长度需要在 1-24 位之间。" },
        { status: 400 }
      );
    }

    const workspaces = await listSupabaseTripWorkspacesForAdmin();
    const workspace = findTripByInviteCode(workspaces, inviteCode);

    if (!workspace) {
      return NextResponse.json(
        { message: "没有找到这个邀请码对应的行程。" },
        { status: 404 }
      );
    }

    const data = workspace.data;
    const existingMember = data.members.find(
      (member) => member.appUserId === user.id
    );

    if (existingMember) {
      return NextResponse.json({
        tripId: data.trip.id,
        memberId: existingMember.id,
        displayName: existingMember.displayName,
        alreadyJoined: true
      });
    }

    const duplicateName = data.members.some(
      (member) =>
        member.displayName.trim().toLowerCase() === displayName.toLowerCase()
    );

    if (duplicateName) {
      return NextResponse.json(
        { message: "这个昵称在当前行程里已经有人用了，请换一个。" },
        { status: 409 }
      );
    }

    const member: TripMember = {
      id: `member-${user.id}`,
      appUserId: user.id,
      displayName,
      role: "member",
      color: memberColors[data.members.length % memberColors.length]
    };
    const nextData: TripPhase1Data = {
      ...data,
      currentMemberId: member.id,
      members: [...data.members, member],
      updatedAt: new Date().toISOString()
    };

    await saveSupabaseTripWorkspaceForAdmin(nextData);

    return NextResponse.json({
      tripId: nextData.trip.id,
      memberId: member.id,
      displayName: member.displayName,
      alreadyJoined: false
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
