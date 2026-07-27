"use client";

import type {
  AiTripDraftRequest,
  AiTripDraftResponse
} from "./ai-types";

export async function requestAiItineraryDraft(
  input: AiTripDraftRequest
): Promise<AiTripDraftResponse> {
  const response = await fetch("/api/trips/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<AiTripDraftResponse> & { message?: string })
    | null;

  if (!response.ok || !payload?.draft) {
    console.error("AI itinerary request failed", {
      status: response.status,
      message: payload?.message
    });

    throw new Error(payload?.message || "AI 草稿生成失败，请稍后再试。");
  }

  return { draft: payload.draft };
}
