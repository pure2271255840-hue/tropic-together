import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthenticatedUser } from "@/features/auth/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    return NextResponse.json({ user });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
