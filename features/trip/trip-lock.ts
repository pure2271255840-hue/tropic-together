import type { PlanPhase } from "./types";

export function isTripContentLocked(phase: PlanPhase) {
  return phase === "final_confirmed" || phase === "travel_active";
}
