import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthenticatedUser } from "@/features/auth/server";
import {
  deleteSupabaseTripWorkspaceForAdmin
} from "@/features/trip/supabase-trip-admin";
import {
  canDeleteTrip,
  requireReadableTrip
} from "@/features/trip/server-authorization";
import { decodeRouteParam } from "@/features/trip/route-params";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ tripId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号，再查看行程。" },
        { status: 401 }
      );
    }

    const { tripId: routeTripId } = await context.params;
    const tripId = decodeRouteParam(routeTripId);
    const result = await requireReadableTrip(tripId, user);

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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号，再删除行程。" },
        { status: 401 }
      );
    }

    const { tripId: routeTripId } = await context.params;
    const tripId = decodeRouteParam(routeTripId);
    const result = await requireReadableTrip(tripId, user);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status }
      );
    }

    if (!canDeleteTrip(result.data, user)) {
      return NextResponse.json(
        { message: "只有行程发起人可以删除这个行程。" },
        { status: 403 }
      );
    }

    await deleteSupabaseTripWorkspaceForAdmin(tripId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
