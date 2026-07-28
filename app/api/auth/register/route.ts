import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/features/auth/password";
import {
  authErrorResponse,
  createSession,
  createUser,
  findUserByUsername,
  normalizeDisplayName,
  normalizeUsername,
  setSessionCookie,
  validateDisplayName,
  validatePassword,
  validateUsername
} from "@/features/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      displayName?: string;
      password?: string;
    };
    const username = normalizeUsername(body.username ?? "");
    const displayName = normalizeDisplayName(body.displayName ?? "");
    const password = body.password ?? "";

    if (!validateUsername(username)) {
      return NextResponse.json(
        { message: "用户名只能包含小写字母、数字、下划线或连字符，长度 2-32 位。" },
        { status: 400 }
      );
    }

    if (!validateDisplayName(displayName)) {
      return NextResponse.json(
        { message: "账号昵称长度需要在 1-24 位之间。" },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { message: "密码长度需要在 6-72 位之间。" },
        { status: 400 }
      );
    }

    const existingUser = await findUserByUsername(username);

    if (existingUser) {
      return NextResponse.json(
        { message: "这个用户名已经被使用。" },
        { status: 409 }
      );
    }

    const user = await createUser(
      username,
      await hashPassword(password),
      displayName
    );
    const session = await createSession(user.id);
    const response = NextResponse.json({ user });

    setSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
