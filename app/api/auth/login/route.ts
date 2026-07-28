import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/features/auth/password";
import {
  authErrorResponse,
  createSession,
  findUserByUsername,
  normalizeUsername,
  setSessionCookie
} from "@/features/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const username = normalizeUsername(body.username ?? "");
    const password = body.password ?? "";
    const user = await findUserByUsername(username);
    const isValid = user
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!user || !isValid) {
      return NextResponse.json(
        { message: "用户名或密码不正确。" },
        { status: 401 }
      );
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user });

    setSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
