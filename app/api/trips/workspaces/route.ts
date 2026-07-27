import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthenticatedUser } from "@/features/auth/server";
import { userCanReadTrip } from "@/features/trip/access";
import { compactTripItineraryHistory, summarizeTripGroup } from "@/features/trip/data-shape";
import {
  listSupabaseTripWorkspacesForAdmin
} from "@/features/trip/supabase-trip-admin";
import {
  saveAuthorizedTripData,
  validateIncomingTripData
} from "@/features/trip/server-authorization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号，再查看行程。" },
        { status: 401 }
      );
    }

    const workspaces = await listSupabaseTripWorkspacesForAdmin();
    const groups = workspaces
      .map((workspace) => compactTripItineraryHistory(workspace.data))
      .filter((data) => userCanReadTrip(data, user))
      .map(summarizeTripGroup);

    return NextResponse.json({ groups });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号，再保存行程。" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      data?: unknown;
    } | null;
    const data = validateIncomingTripData(body?.data);

    if (!data) {
      return NextResponse.json(
        { message: "行程数据不完整，无法保存。" },
        { status: 400 }
      );
    }

    const result = await saveAuthorizedTripData(data, user);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
