import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthenticatedUser } from "@/features/auth/server";
import { isTripPhase1Data } from "@/features/trip/data-shape";
import type {
  AiItineraryDayDraft,
  AiItineraryDraft,
  AiItineraryItemDraft,
  ItineraryVersion,
  PlaceVote,
  TravelPlace,
  TripMember,
  TripPhase1Data
} from "@/features/trip/types";
import type { AiTripDraftRequest } from "@/features/trip/ai-types";
import {
  buildPlaceRankings,
  placeInitialTagLabels
} from "@/features/trip/trip-labels";

export const runtime = "nodejs";

const deepSeekBaseUrl = "https://api.deepseek.com";
const defaultModel = "deepseek-v4-flash";
const defaultMaxTokens = 8000;

function normalizeApiKey(value?: string) {
  return value?.trim().replace(/^Bearer\s+/i, "");
}

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type DeepSeekAttempt = {
  label: string;
  useJsonMode: boolean;
  includeThinking: boolean;
};

type DeepSeekAttemptResult = {
  ok: boolean;
  status: number;
  responseText: string;
  parsedResponse: DeepSeekResponse;
  traceId: string | null;
};

type PromptPayload = {
  mode: AiTripDraftRequest["mode"];
  trip: {
    name: string;
    startDate: string;
    endDate: string;
    timezone: string;
    destinations: string[];
    hotelAddress?: string;
  };
  places: Array<{
    name: string;
    city: string;
    category: string;
    initialOpinion: string;
    preferenceRank: number;
    preferenceScore: number;
    upVotes: number;
    downVotes: number;
    address: string;
    mapUrl?: string;
    coordinate?: {
      lat: number;
      lng: number;
    };
    notes: string;
    suggestedDuration: string;
    votes: Array<{
      memberName: string;
      value: PlaceVote["value"];
      reason: string;
    }>;
  }>;
  currentVersion?: {
    label: string;
    days: Array<{
      date: string;
      title: string;
      city: string;
      summary: string;
      items: Array<{
        title: string;
        placeName?: string;
        startTime: string;
        endTime: string;
        notes: string;
        isLocked: boolean;
      }>;
    }>;
  };
};

function memberName(members: TripMember[], memberId: string) {
  return members.find((member) => member.id === memberId)?.displayName ?? "成员";
}

function placeVotesForPlace(
  place: TravelPlace,
  votes: PlaceVote[],
  members: TripMember[]
) {
  return votes
    .filter((vote) => vote.placeId === place.id)
    .map((vote) => ({
      memberName: memberName(members, vote.memberId),
      value: vote.value,
      reason: vote.reason
    }));
}

function versionPayload(
  version: ItineraryVersion | undefined,
  places: TravelPlace[]
): PromptPayload["currentVersion"] {
  if (!version) {
    return undefined;
  }

  return {
    label: version.label,
    days: version.days.map((day) => ({
      date: day.date,
      title: day.title,
      city: day.city,
      summary: day.summary,
      items: day.items.map((item) => ({
        title: item.title,
        placeName: item.placeId
          ? places.find((place) => place.id === item.placeId)?.name
          : undefined,
        startTime: item.startTime,
        endTime: item.endTime,
        notes: item.notes,
        isLocked: item.isLocked
      }))
    }))
  };
}

function buildPromptPayload(
  body: AiTripDraftRequest,
  currentVersion: ItineraryVersion | undefined
): PromptPayload {
  const rankings = buildPlaceRankings(body.data.places, body.data.placeVotes);

  return {
    mode: body.mode,
    trip: {
      name: body.data.trip.name,
      startDate: body.data.trip.startDate,
      endDate: body.data.trip.endDate,
      timezone: body.data.trip.timezone,
      destinations: body.data.trip.destinations,
      hotelAddress: body.data.trip.hotelAddress
    },
    places: rankings.map((ranking) => {
      const place = ranking.place;

      return {
        name: place.name,
        city: place.city,
        category: place.category,
        initialOpinion: placeInitialTagLabels[place.initialTag],
        preferenceRank: ranking.rank,
        preferenceScore: ranking.score,
        upVotes: ranking.upCount,
        downVotes: ranking.downCount,
        address: place.address,
        mapUrl: place.mapUrl,
        coordinate: place.coordinate,
        notes: place.notes,
        suggestedDuration: place.suggestedDuration,
        votes: placeVotesForPlace(place, body.data.placeVotes, body.data.members)
      };
    }),
    currentVersion: versionPayload(currentVersion, body.data.places)
  };
}

function parseRequestBody(value: unknown): AiTripDraftRequest | null {
  const candidate = value as AiTripDraftRequest | undefined;

  if (
    !candidate ||
    (candidate.mode !== "generate" && candidate.mode !== "organize") ||
    !isTripPhase1Data(candidate.data)
  ) {
    return null;
  }

  return candidate;
}

function jsonInstruction() {
  return [
    "你是一个私密朋友旅行协作工具里的行程草稿助手。",
    "只输出 JSON，不要 Markdown，不要解释。",
    "输出结构必须是：",
    '{"label":"AI 草稿","days":[{"date":"YYYY-MM-DD","title":"string","city":"string","summary":"string","items":[{"title":"string","placeName":"string","startTime":"HH:mm","endTime":"HH:mm","notes":"string"}]}]}',
    "规则：",
    "- 结果只是可编辑草稿，不要声称已经确认最终版。",
    "- 优先使用 places 中已有地点，placeName 必须尽量与 places.name 完全一致。",
    "- places 已按成员偏好粗排，preferenceScore/preferenceRank 只作为偏好参考，不要把分数当唯一排序依据。",
    "- 安排活动时要根据 city、address、coordinate 和酒店地址把相近地点放在同一天或相邻时段，减少跨城折返和来回绕路；必要时可以为了路线顺畅牺牲少量偏好分。",
    "- 如果 mode 是 organize，要尊重 currentVersion 里 isLocked 为 true 的活动。",
    "- 不要编造票务、护照、预订号、联系方式或费用。",
    "- 日期必须在 startDate 和 endDate 范围内。",
    "- 没把握的交通、天气、营业时间只写成备注，不要写死。"
  ].join("\n");
}

function userPrompt(payload: PromptPayload) {
  const task =
    payload.mode === "organize"
      ? "请整理 currentVersion，并结合地点池与投票理由生成一个更顺的新版草稿。"
      : "请根据行程日期、地点池与投票理由生成第一版可编辑行程草稿。";

  return `${task}\n\n输入 JSON：\n${JSON.stringify(payload)}`;
}

function retryPrompt(payload: PromptPayload) {
  return [
    userPrompt(payload),
    "",
    "再次强调：最终回复必须只包含一个 JSON object，第一字符必须是 {，最后字符必须是 }。"
  ].join("\n");
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanItems(value: unknown): AiItineraryItemDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      const candidate = item as AiItineraryItemDraft;
      const title = cleanString(candidate.title);

      if (!title) {
        return [];
      }

      return [{
        title,
        placeName: cleanString(candidate.placeName) || undefined,
        startTime: validTime(candidate.startTime) ? candidate.startTime : "",
        endTime: validTime(candidate.endTime) ? candidate.endTime : "",
        notes: cleanString(candidate.notes)
      }];
    });
}

function cleanDraft(value: unknown): AiItineraryDraft | null {
  const candidate = value as AiItineraryDraft | undefined;

  if (!candidate || !Array.isArray(candidate.days)) {
    return null;
  }

  const days = candidate.days
    .flatMap((day) => {
      const draftDay = day as AiItineraryDayDraft;
      const date = draftDay.date;
      const title = cleanString(draftDay.title);
      const items = cleanItems(draftDay.items);

      if (!validDate(date) || !title || items.length === 0) {
        return [];
      }

      return [{
        date,
        title,
        city: cleanString(draftDay.city),
        summary: cleanString(draftDay.summary),
        items
      }];
    })
    .sort((left, right) => left.date.localeCompare(right.date));

  if (days.length === 0) {
    return null;
  }

  return {
    label: cleanString(candidate.label) || "AI 草稿",
    days
  };
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    try {
      return jsonMatch ? (JSON.parse(jsonMatch[0]) as unknown) : null;
    } catch {
      return null;
    }
  }
}

function parseDeepSeekResponse(value: string): DeepSeekResponse {
  try {
    return value ? (JSON.parse(value) as DeepSeekResponse) : {};
  } catch {
    return {};
  }
}

function shouldRetryWithoutThinking(result: DeepSeekAttemptResult) {
  const message = `${result.parsedResponse.error?.message ?? ""} ${
    result.responseText
  }`.toLowerCase();

  return (
    !result.ok &&
    result.status === 400 &&
    (message.includes("thinking") ||
      message.includes("unsupported") ||
      message.includes("invalid") ||
      message.includes("extra"))
  );
}

async function callDeepSeek({
  apiKey,
  model,
  maxTokens,
  payload,
  attempt
}: {
  apiKey: string;
  model: string;
  maxTokens: number;
  payload: PromptPayload;
  attempt: DeepSeekAttempt;
}): Promise<DeepSeekAttemptResult> {
  const requestBody = {
    model,
    messages: [
      { role: "system", content: jsonInstruction() },
      {
        role: "user",
        content: attempt.useJsonMode ? userPrompt(payload) : retryPrompt(payload)
      }
    ],
    ...(attempt.includeThinking ? { thinking: { type: "disabled" } } : {}),
    ...(attempt.useJsonMode ? { response_format: { type: "json_object" } } : {}),
    temperature: attempt.useJsonMode ? 0.35 : 0.2,
    max_tokens: maxTokens
  };

  const response = await fetch(`${deepSeekBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
    cache: "no-store"
  });
  const responseText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    responseText,
    parsedResponse: parseDeepSeekResponse(responseText),
    traceId: response.headers.get("x-ds-trace-id")
  };
}

export async function POST(request: NextRequest) {
  const apiKey = normalizeApiKey(process.env.DEEPSEEK_API_KEY);
  const model = process.env.DEEPSEEK_MODEL?.trim() || defaultModel;
  const maxTokens = Number(process.env.DEEPSEEK_MAX_TOKENS) || defaultMaxTokens;
  let user = null;

  try {
    user = await getAuthenticatedUser(request);
  } catch (error) {
    const { message, status } = authErrorResponse(error);

    return NextResponse.json({ message }, { status });
  }

  if (!user) {
    return NextResponse.json(
      { message: "请先登录账号，再使用 AI 草稿。" },
      { status: 401 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { message: "服务端还没有配置 DEEPSEEK_API_KEY。" },
      { status: 503 }
    );
  }

  const body = parseRequestBody(await request.json().catch(() => null));

  if (!body) {
    return NextResponse.json({ message: "AI 请求数据不完整。" }, { status: 400 });
  }

  if (body.data.places.length === 0) {
    return NextResponse.json(
      { message: "要先添加地点，才能生成 AI 草稿。" },
      { status: 400 }
    );
  }

  const currentVersion =
    body.mode === "organize"
      ? body.data.itineraryVersions.find((version) => version.id === body.versionId)
      : undefined;

  if (body.mode === "organize" && !currentVersion) {
    return NextResponse.json(
      { message: "没有找到要整理的行程草稿。" },
      { status: 400 }
    );
  }

  const payload = buildPromptPayload(body, currentVersion);
  const attempts: DeepSeekAttempt[] = [
    { label: "json-thinking-disabled", useJsonMode: true, includeThinking: true },
    { label: "json-no-thinking", useJsonMode: true, includeThinking: false },
    { label: "text-json-extract", useJsonMode: false, includeThinking: false }
  ];
  let lastResult: DeepSeekAttemptResult | null = null;

  for (const attempt of attempts) {
    let result: DeepSeekAttemptResult;

    try {
      result = await callDeepSeek({
        apiKey,
        model,
        maxTokens,
        payload,
        attempt
      });
    } catch (error) {
      console.error("DeepSeek connection failed", {
        attempt: attempt.label,
        message: error instanceof Error ? error.message : String(error),
        cause:
          error instanceof Error && "cause" in error
            ? String(error.cause)
            : undefined
      });

      return NextResponse.json(
        { message: "无法连接 DeepSeek，请检查 API key 格式或本机网络。" },
        { status: 502 }
      );
    }

    lastResult = result;

    if (!result.ok) {
      console.error("DeepSeek request failed", {
        attempt: attempt.label,
        status: result.status,
        message:
          result.parsedResponse.error?.message ||
          result.responseText.slice(0, 500),
        traceId: result.traceId
      });

      if (attempt.includeThinking && shouldRetryWithoutThinking(result)) {
        continue;
      }

      if (attempt.useJsonMode) {
        continue;
      }

      return NextResponse.json(
        {
          message:
            result.parsedResponse.error?.message ||
            `DeepSeek 请求失败：${result.status}`
        },
        { status: 502 }
      );
    }

    const content = result.parsedResponse.choices?.[0]?.message?.content;
    const draft = content ? cleanDraft(parseJsonContent(content)) : null;

    if (draft) {
      return NextResponse.json({ draft });
    }

    console.error("DeepSeek returned invalid itinerary draft", {
      attempt: attempt.label,
      traceId: result.traceId,
      content: content?.slice(0, 500)
    });
  }

  return NextResponse.json(
    {
      message:
        lastResult?.parsedResponse.error?.message ||
        "AI 返回的草稿结构不完整，请再试一次。"
    },
    { status: 502 }
  );
}
