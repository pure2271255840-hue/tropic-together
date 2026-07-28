import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/features/auth/password";
import {
  authErrorResponse,
  findUserByUsername,
  normalizeUsername,
  updateUserPassword,
  validatePassword,
  validateUsername
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

    if (!validateUsername(username)) {
      return NextResponse.json(
        { message: "请输入正确的账号。" },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { message: "新密码长度需要在 6-72 位之间。" },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { message: "没有找到这个账号。" },
        { status: 404 }
      );
    }

    await updateUserPassword(user.id, await hashPassword(password));

    return NextResponse.json({
      user: null,
      message: "密码已重置，请使用新密码登录。"
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }
}
