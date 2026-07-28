import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  clearSessionCookie,
  getAuthenticatedUser,
  normalizeDisplayName,
  updateUserDisplayName,
  validateDisplayName
} from "@/features/auth/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to restore auth session", error);

    const response = NextResponse.json({ user: null });
    clearSessionCookie(response);

    return response;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "请先登录账号。" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      displayName?: string;
    };
    const displayName = normalizeDisplayName(body.displayName ?? "");

    if (!validateDisplayName(displayName)) {
      return NextResponse.json(
        { message: "账号昵称长度需要在 1-24 位之间。" },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserDisplayName(user.id, displayName);

    return NextResponse.json({ user: updatedUser ?? user });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
