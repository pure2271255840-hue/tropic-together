"use client";

export type JoinTripResult = {
  tripId: string;
  memberId: string;
  displayName: string;
  alreadyJoined: boolean;
};

export async function joinTripWithInvite(
  inviteCode: string,
  displayName: string
) {
  const response = await fetch("/api/trips/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode, displayName })
  });
  const payload = (await response.json().catch(() => ({}))) as
    | JoinTripResult
    | { message?: string };
  const errorMessage = "message" in payload ? payload.message : undefined;

  if (!response.ok) {
    throw new Error(errorMessage || "暂时无法加入行程。");
  }

  return payload as JoinTripResult;
}
