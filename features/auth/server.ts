import { createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import {
  encodeFilterValue,
  supabaseAdminRequest,
  SupabaseAdminError
} from "@/features/supabase/server-admin";
import type { AuthUser } from "./types";

export const sessionCookieName = "tropic_together_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

type AppUserRow = {
  id: string;
  username: string;
  display_name?: string | null;
  password_hash: string;
  created_at: string;
};

type AppSessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

export type AppUserWithPassword = AuthUser & {
  passwordHash: string;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(username: string) {
  return /^[a-z0-9_-]{2,32}$/.test(username);
}

export function validatePassword(password: string) {
  return password.length >= 6 && password.length <= 72;
}

export function normalizeDisplayName(value: string) {
  return value.trim();
}

export function validateDisplayName(displayName: string) {
  return displayName.length >= 1 && displayName.length <= 24;
}

function toAuthUser(row: AppUserRow): AuthUser {
  const displayName = normalizeDisplayName(row.display_name ?? "");

  return {
    id: row.id,
    username: row.username,
    ...(displayName ? { displayName } : {}),
    createdAt: row.created_at
  };
}

function toUserWithPassword(row: AppUserRow): AppUserWithPassword {
  return {
    ...toAuthUser(row),
    passwordHash: row.password_hash
  };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findUserByUsername(username: string) {
  const rows = await supabaseAdminRequest<AppUserRow[]>(
    "app_users",
    `?select=*&username=eq.${encodeFilterValue(
      username
    )}&limit=1`
  );

  return rows[0] ? toUserWithPassword(rows[0]) : null;
}

export async function findUserById(userId: string) {
  const rows = await supabaseAdminRequest<AppUserRow[]>(
    "app_users",
    `?select=*&id=eq.${encodeFilterValue(
      userId
    )}&limit=1`
  );

  return rows[0] ? toUserWithPassword(rows[0]) : null;
}

export async function createUser(
  username: string,
  passwordHash: string,
  displayName: string
) {
  const rows = await supabaseAdminRequest<AppUserRow[]>(
    "app_users",
    "",
    {
      method: "POST",
      body: JSON.stringify({
        username,
        display_name: normalizeDisplayName(displayName),
        password_hash: passwordHash
      })
    },
    "return=representation"
  );

  return toAuthUser(rows[0]);
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string
) {
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const rows = await supabaseAdminRequest<AppUserRow[]>(
    "app_users",
    `?id=eq.${encodeFilterValue(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        display_name: normalizedDisplayName || null,
        updated_at: new Date().toISOString()
      })
    },
    "return=representation"
  );

  return rows[0] ? toAuthUser(rows[0]) : null;
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string
) {
  await supabaseAdminRequest<AppUserRow[]>(
    "app_users",
    `?id=eq.${encodeFilterValue(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
    },
    "return=minimal"
  );
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + sessionMaxAgeSeconds * 1000
  ).toISOString();

  await supabaseAdminRequest<AppSessionRow[]>(
    "app_sessions",
    "",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        token_hash: hashToken(token),
        expires_at: expiresAt
      })
    },
    "return=minimal"
  );

  return { token, expiresAt };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: string
) {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
    maxAge: sessionMaxAgeSeconds
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const rows = await supabaseAdminRequest<AppSessionRow[]>(
    "app_sessions",
    `?select=id,user_id,token_hash,expires_at,created_at&token_hash=eq.${encodeFilterValue(
      hashToken(token)
    )}&limit=1`
  );
  const session = rows[0];

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const user = await findUserById(session.user_id);

  return user
    ? {
        id: user.id,
        username: user.username,
        ...(user.displayName ? { displayName: user.displayName } : {}),
        createdAt: user.createdAt
      }
    : null;
}

export async function deleteSession(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;

  if (!token) {
    return;
  }

  await supabaseAdminRequest<undefined>(
    "app_sessions",
    `?token_hash=eq.${encodeFilterValue(hashToken(token))}`,
    { method: "DELETE" },
    "return=minimal"
  );
}

export function authErrorResponse(error: unknown) {
  if (error instanceof SupabaseAdminError) {
    return {
      message:
        error.status === 503
          ? "账号服务还没有配置 Supabase 服务端密钥。"
          : "账号服务暂时不可用。",
      status: error.status
    };
  }

  return {
    message: "账号服务暂时不可用。",
    status: 500
  };
}
