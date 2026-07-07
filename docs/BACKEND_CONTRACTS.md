# Backend Contracts

Status: architecture documentation only. These contracts describe the intended API shape and boundaries; they are not implementation code.

## Contract Principles

- Browser and mobile clients call Tropic Together backend APIs only.
- Provider SDKs and provider API keys stay server-side.
- Product data models must not depend on a specific AI, map, database, or storage provider.
- Contracts must work for both web and future Expo clients.
- Responses should avoid exposing raw provider names, raw model names, provider tokens, provider trace IDs, or provider billing data to normal users.

## AI Provider Abstraction

Conceptual server-side interface:

```ts
type AIEnvironment = "cn" | "global";
type PlanningMode = "cn_stable" | "fast" | "deep" | "high_quality_global";
type LatencyTier = "low" | "medium" | "high";
type CostTier = "low" | "medium" | "high";

type AIModelProfile = {
  provider: string;
  model: string;
  availability: AIEnvironment[];
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  latencyTier: LatencyTier;
  costTier: CostTier;
  enabled: boolean;
  fallbackPriority: number;
};

type ProviderCapabilities = {
  structuredOutput: boolean;
  vision: boolean;
  streaming: boolean;
  maxInputTokens?: number;
};

type AIProvider = {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>>;
  streamText?: (input: GenerateTextInput) => AsyncIterable<GenerateTextChunk>;
  getCapabilities(): ProviderCapabilities;
};
```

`ModelRegistry` is a server-side service that selects an enabled `AIModelProfile` by environment, mode, required capability, cost tier, latency tier, and fallback priority.

Provider-specific details must remain outside domain logic:

- SDK imports and client construction
- API keys and signing credentials
- base URLs and endpoint paths
- model names and provider feature flags
- provider retry behavior, rate limits, billing, and error mapping
- response repair or normalization quirks

## AI Itinerary Planning Request

Client-to-backend typed request shape:

```ts
type AIItineraryPlanningRequest = {
  requestId: string;
  tripId: string;
  mode: "cn_stable" | "fast" | "deep" | "high_quality_global";
  locale: "zh-CN" | "en" | "ja" | "ko";
  timezone: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  travelers: Array<{
    travelerId: string;
    displayLabel: string;
    role?: "owner" | "admin" | "member" | "viewer";
  }>;
  tripContext: {
    title: string;
    destinationNames: string[];
    roughBudgetLevel?: "low" | "medium" | "high";
    pace?: "relaxed" | "balanced" | "packed";
  };
  constraints: Array<{
    type: "time" | "budget" | "accessibility" | "diet" | "transport" | "custom";
    description: string;
  }>;
  preferences: Array<{
    category: "food" | "nature" | "culture" | "shopping" | "rest" | "adventure" | "custom";
    weight: "low" | "medium" | "high";
    description: string;
  }>;
  knownPlaces: Array<{
    placeId: string;
    name: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
      source: "wgs84";
    };
    tags?: string[];
    estimatedDurationMinutes?: number;
  }>;
  existingItinerary?: Array<{
    date: string;
    items: Array<{
      itemId: string;
      title: string;
      startTime?: string;
      endTime?: string;
      placeId?: string;
      locked?: boolean;
    }>;
  }>;
  output: {
    format: "daily_plan";
    maxAlternatives?: number;
  };
};
```

Privacy rule: this request must not include original flight tickets, hotel PDFs, booking references, passport data, full email addresses, raw uploaded documents, or unnecessary private notes.

## AI Itinerary Planning Response

Backend-to-client typed response shape:

```ts
type AIItineraryPlanningResponse = {
  requestId: string;
  tripId: string;
  mode: "cn_stable" | "fast" | "deep" | "high_quality_global";
  status: "completed" | "partial" | "failed";
  plan?: {
    days: Array<{
      date: string;
      summary: string;
      items: Array<{
        title: string;
        startTime?: string;
        endTime?: string;
        placeId?: string;
        city?: string;
        rationale?: string;
        estimatedDurationMinutes?: number;
        confidence: "low" | "medium" | "high";
      }>;
    }>;
  };
  warnings: Array<{
    code: string;
    message: string;
  }>;
  assumptions: string[];
  nextActions: Array<{
    label: string;
    actionType: "review" | "save_draft" | "refine" | "manual_edit";
  }>;
};
```

Normal user responses should not include raw `provider`, `model`, token counts, cost estimates, or provider trace IDs. Those belong in server logs or internal admin/evaluation tools.

## Server-Only AI Execution Metadata

Internal metadata may include:

```ts
type AIExecutionMetadata = {
  provider: string;
  model: string;
  environment: "cn" | "global";
  latencyMs: number;
  estimatedCostTier: "low" | "medium" | "high";
  structuredOutputValid: boolean;
  fallbackUsed: boolean;
  providerRequestId?: string;
};
```

This metadata is not part of the public browser/mobile API by default.

## Future Internal Evaluation Contract

Internal evaluation should run anonymized inputs against multiple providers through the same abstraction and compare:

- structured-output validity
- itinerary usefulness and coherence
- latency
- estimated cost
- failure modes and fallback behavior

This is future internal tooling only, not part of the MVP.
