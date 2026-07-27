import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthenticatedUser } from "@/features/auth/server";
import { createSupabaseRealtimeToken } from "@/features/supabase/realtime-token";
import { requireReadableTrip } from "@/features/trip/server-authorization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号，再订阅行程更新。" },
        { status: 401 }
      );
    }

    const tripId = request.nextUrl.searchParams.get("tripId")?.trim();

    if (!tripId) {
      return NextResponse.json(
        { message: "缺少要订阅的行程 ID。" },
        { status: 400 }
      );
    }

    const access = await requireReadableTrip(tripId, user);

    if (!access.ok) {
      return NextResponse.json(
        { message: access.message },
        { status: access.status }
      );
    }

    const token = createSupabaseRealtimeToken(user, tripId);

    if (!token) {
      return NextResponse.json(
        { message: "服务端还没有配置 SUPABASE_JWT_SECRET。" },
        { status: 503 }
      );
    }

    return NextResponse.json(token);
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
