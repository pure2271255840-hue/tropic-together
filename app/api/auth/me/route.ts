import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  getAuthenticatedUser
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
