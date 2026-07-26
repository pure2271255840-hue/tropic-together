import type {
  ItinerarySource,
  ItineraryVersionStatus,
  ItineraryVoteValue,
  PlaceInitialTag,
  PlaceScoreSection,
  PlaceVote,
  PlaceVoteValue,
  PlanPhase,
  TravelPlace
} from "./types";

export const planPhaseLabels: Record<PlanPhase, string> = {
  setup: "设置计划中",
  collecting_places: "收集地点中",
  place_voting: "地点投票中",
  draft_ready: "可生成行程草稿",
  itinerary_voting: "行程投票中",
  final_confirmed: "已确认最终版",
  travel_active: "旅行进行中"
};

export const placeInitialTagLabels: Record<PlaceInitialTag, string> = {
  must_go: "一定要去",
  nice_to_have: "还不错"
};

export const placeInitialTagScores: Record<PlaceInitialTag, number> = {
  must_go: 3,
  nice_to_have: 1
};

export const placeVoteLabels: Record<PlaceVoteValue, string> = {
  up: "想去",
  down: "不想去"
};

export const itineraryVersionStatusLabels: Record<
  ItineraryVersionStatus,
  string
> = {
  draft: "草稿",
  final: "最终版"
};

export const itinerarySourceLabels: Record<ItinerarySource, string> = {
  ai: "AI 生成",
  manual: "手动编辑"
};

export const itineraryVoteLabels: Record<ItineraryVoteValue, string> = {
  up: "同意",
  down: "不同意"
};

export const placeScoreSectionLabels: Record<PlaceScoreSection, string> = {
  high_priority: "高优先级",
  easy_route: "可顺路安排",
  disputed: "争议地点",
  parked: "暂不安排"
};

export const placeScoreSectionHints: Record<PlaceScoreSection, string> = {
  high_priority: "适合优先进草稿",
  easy_route: "顺路时安排",
  disputed: "需要看理由再决定",
  parked: "Phase 1 先不排"
};

export const placeScoreSectionOrder: Record<PlaceScoreSection, number> = {
  high_priority: 0,
  easy_route: 1,
  disputed: 2,
  parked: 3
};

export type RankedPlace = {
  place: TravelPlace;
  votes: PlaceVote[];
  score: number;
  upCount: number;
  downCount: number;
  section: PlaceScoreSection;
  rank: number;
};

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${date}T00:00:00+08:00`));
}

export function scorePlace(place: TravelPlace, votes: PlaceVote[]) {
  return votes.reduce(
    (total, vote) => total + (vote.value === "up" ? 2 : -2),
    placeInitialTagScores[place.initialTag]
  );
}

export function getPlaceScoreSection(
  score: number,
  upCount: number,
  downCount: number
): PlaceScoreSection {
  if (downCount >= 2 || (upCount >= 2 && downCount >= 1)) {
    return "disputed";
  }

  if (score >= 5) {
    return "high_priority";
  }

  if (score >= 2) {
    return "easy_route";
  }

  return "parked";
}

export function buildPlaceRankings(
  places: TravelPlace[],
  votes: PlaceVote[]
): RankedPlace[] {
  return places
    .map((place) => {
      const placeVotes = votes.filter((vote) => vote.placeId === place.id);
      const upCount = placeVotes.filter((vote) => vote.value === "up").length;
      const downCount = placeVotes.filter((vote) => vote.value === "down").length;
      const score = scorePlace(place, placeVotes);

      return {
        place,
        votes: placeVotes,
        score,
        upCount,
        downCount,
        section: getPlaceScoreSection(score, upCount, downCount),
        rank: 0
      };
    })
    .sort((left, right) => {
      const sectionDelta =
        placeScoreSectionOrder[left.section] - placeScoreSectionOrder[right.section];

      if (sectionDelta !== 0) {
        return sectionDelta;
      }

      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.place.name.localeCompare(right.place.name, "zh-CN");
    })
    .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
}
