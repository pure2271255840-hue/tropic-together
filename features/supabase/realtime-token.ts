import { createHmac } from "crypto";
import type { AuthUser } from "@/features/auth/types";

const realtimeTokenTtlSeconds = 60 * 15;

function base64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function getSupabaseJwtSecret() {
  return process.env.SUPABASE_JWT_SECRET?.trim() || "";
}

export function createSupabaseRealtimeToken(user: AuthUser, tripId: string) {
  const secret = getSupabaseJwtSecret();

  if (!secret) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + realtimeTokenTtlSeconds;
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const payload = {
    aud: "authenticated",
    exp: expiresAt,
    iat: issuedAt,
    role: "authenticated",
    sub: user.id,
    app_user_id: user.id,
    trip_id: tripId
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload)
  )}`;
  const signature = createHmac("sha256", secret)
    .update(unsignedToken)
    .digest();

  return {
    token: `${unsignedToken}.${base64Url(signature)}`,
    expiresAt
  };
}
