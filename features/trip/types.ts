export type TripRole = "owner" | "member";

export type PlanPhase =
  | "setup"
  | "collecting_places"
  | "place_voting"
  | "draft_ready"
  | "itinerary_voting"
  | "final_confirmed"
  | "travel_active";

export type PlaceInitialTag = "must_go" | "nice_to_have";

export type PlaceVoteValue = "up" | "down";

export type PlaceScoreSection =
  | "high_priority"
  | "easy_route"
  | "disputed"
  | "parked";

export type ItineraryVersionStatus = "draft" | "final";

export type ItinerarySource = "ai" | "manual";

export type ItineraryVoteValue = "up" | "down";

export type Coordinate = {
  lat: number;
  lng: number;
};

export type TripMember = {
  id: string;
  displayName: string;
  role: TripRole;
  color: "teal" | "coral" | "sunset" | "leaf";
};

export type TripOverview = {
  id: string;
  name: string;
  subtitle: string;
  ownerMemberId: string;
  startDate: string;
  endDate: string;
  timezone: string;
  destinations: string[];
  phase: PlanPhase;
  inviteUrl: string;
  hotelAddress?: string;
};

export type TravelPlace = {
  id: string;
  tripId: string;
  name: string;
  city: string;
  category: string;
  initialTag: PlaceInitialTag;
  address: string;
  notes: string;
  suggestedDuration: string;
  coordinate?: Coordinate;
  addedByMemberId: string;
  createdAt: string;
  updatedAt: string;
};

export type PlaceVote = {
  id: string;
  placeId: string;
  memberId: string;
  value: PlaceVoteValue;
  reason: string;
  updatedAt: string;
};

export type ItineraryItem = {
  id: string;
  dayId: string;
  title: string;
  placeId?: string;
  startTime: string;
  endTime: string;
  notes: string;
  isLocked: boolean;
};

export type ItineraryDay = {
  id: string;
  versionId: string;
  date: string;
  title: string;
  city: string;
  summary: string;
  items: ItineraryItem[];
};

export type ItineraryVersion = {
  id: string;
  tripId: string;
  versionNumber: number;
  label: string;
  status: ItineraryVersionStatus;
  source: ItinerarySource;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
  days: ItineraryDay[];
};

export type ItineraryVote = {
  id: string;
  versionId: string;
  memberId: string;
  value: ItineraryVoteValue;
  reason: string;
  updatedAt: string;
};

export type TripPhase1Data = {
  trip: TripOverview;
  members: TripMember[];
  currentMemberId: string;
  places: TravelPlace[];
  placeVotes: PlaceVote[];
  itineraryVersions: ItineraryVersion[];
  currentItineraryVersionId: string;
  itineraryVotes: ItineraryVote[];
  updatedAt: string;
};

export type TripGroupSummary = {
  id: string;
  name: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  phase: PlanPhase;
  inviteUrl: string;
  members: TripMember[];
  placeCount: number;
  updatedAt: string;
};

export type PlaceInput = {
  name: string;
  city: string;
  category: string;
  initialTag: PlaceInitialTag;
  address: string;
  notes: string;
  suggestedDuration: string;
  lat?: number;
  lng?: number;
};

export type ItineraryItemInput = {
  versionId: string;
  dayId: string;
  title: string;
  placeId?: string;
  startTime: string;
  endTime: string;
  notes: string;
  isLocked: boolean;
};

export type ItineraryDayInput = {
  versionId: string;
  date: string;
  title: string;
  city: string;
  summary: string;
};
