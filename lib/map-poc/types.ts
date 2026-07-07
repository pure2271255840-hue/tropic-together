export type CoordinateSystem = "wgs84";

export type Coordinate = {
  lat: number;
  lng: number;
  system: CoordinateSystem;
};

export type MapCapability =
  | "mapInitialLoad"
  | "tileRendering"
  | "wgs84PinAccuracy"
  | "markerDisplay"
  | "placeSearch"
  | "routeCalculation"
  | "mobileInteraction"
  | "fallbackList"
  | "staticPlaceholder"
  | "externalNavigation";

export type ProviderKind = "amap" | "tencent" | "baidu" | "raster" | "fallback";

export type MapProvider = {
  id: string;
  label: string;
  kind: ProviderKind;
  includedBecause: string;
  requiredEnv: string[];
  capabilities: MapCapability[];
  productionCandidate: boolean;
};

export type PlaceSearchResult = {
  providerId: string;
  placeId?: string;
  name: string;
  address?: string;
  city?: string;
  coordinate?: Coordinate;
  rawConfidence?: "low" | "medium" | "high";
};

export type TravelMode = "driving" | "walking" | "transit";

export type RouteRequest = {
  id: string;
  label: string;
  mode: TravelMode;
  origin: TestPlace;
  waypoints: TestPlace[];
  destination: TestPlace;
};

export type RouteResult = {
  providerId: string;
  routeId: string;
  distanceMeters?: number;
  durationSeconds?: number;
  path?: Coordinate[];
  summary?: string;
  externalUrl?: string;
};

export type TestCity = "penang" | "kota-kinabalu";

export type TestPlace = {
  id: string;
  city: TestCity;
  name: string;
  coordinate: Coordinate;
  searchQuery: string;
};

export type NetworkCondition =
  | "Mainland China / no VPN"
  | "Mainland China / VPN"
  | "Overseas";

export type PocTestStatus = "not-run" | "running" | "passed" | "failed" | "unsupported";

export type MapPocResult = {
  selectedProvider: string;
  mapLoaded: PocTestStatus;
  tileRendering: PocTestStatus;
  wgs84PinAccuracy: PocTestStatus;
  markerDisplay: PocTestStatus;
  placeSearch: PocTestStatus;
  routeCalculation: PocTestStatus;
  mobileInteraction: PocTestStatus;
  visibleErrors: string[];
  manualTesterNotes: string;
  timestamp: string;
  networkCondition: NetworkCondition;
};
