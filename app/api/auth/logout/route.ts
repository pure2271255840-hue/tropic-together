import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  clearSessionCookie,
  deleteSession
} from "@/features/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await deleteSession(request);

    const response = NextResponse.json({ user: null });
    clearSessionCookie(response);

    return response;
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
