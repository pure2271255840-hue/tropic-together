import type { AiItineraryDraft, TripPhase1Data } from "./types";

export type AiTripActionMode = "generate" | "organize";

export type AiTripDraftRequest = {
  mode: AiTripActionMode;
  data: TripPhase1Data;
  versionId?: string;
};

export type AiTripDraftResponse = {
  draft: AiItineraryDraft;
};
