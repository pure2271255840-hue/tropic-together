import type { MapProvider } from "./types";

export const mapPocProviders: MapProvider[] = [
  {
    id: "amap",
    label: "AMap / Gaode",
    kind: "amap",
    includedBecause:
      "Mainland-accessible candidate with mature web SDK; the POC must verify Malaysia place and route coverage.",
    requiredEnv: ["NEXT_PUBLIC_MAP_POC_AMAP_KEY", "NEXT_PUBLIC_MAP_POC_AMAP_SECURITY_CODE"],
    capabilities: [
      "mapInitialLoad",
      "tileRendering",
      "wgs84PinAccuracy",
      "markerDisplay",
      "placeSearch",
      "routeCalculation",
      "mobileInteraction"
    ],
    productionCandidate: true
  },
  {
    id: "tencent",
    label: "Tencent Maps",
    kind: "tencent",
    includedBecause:
      "Mainland-accessible candidate; useful as a second domestic comparison for web/mobile interaction and overseas coverage.",
    requiredEnv: ["NEXT_PUBLIC_MAP_POC_TENCENT_KEY"],
    capabilities: [
      "mapInitialLoad",
      "tileRendering",
      "wgs84PinAccuracy",
      "markerDisplay",
      "placeSearch",
      "routeCalculation",
      "mobileInteraction"
    ],
    productionCandidate: true
  },
  {
    id: "baidu",
    label: "Baidu Maps",
    kind: "baidu",
    includedBecause:
      "Mainland-accessible baseline; included to expose coordinate-system and Malaysia coverage risks early.",
    requiredEnv: ["NEXT_PUBLIC_MAP_POC_BAIDU_AK"],
    capabilities: [
      "mapInitialLoad",
      "tileRendering",
      "wgs84PinAccuracy",
      "markerDisplay",
      "placeSearch",
      "routeCalculation",
      "mobileInteraction"
    ],
    productionCandidate: true
  },
  {
    id: "raster",
    label: "Configurable raster tiles",
    kind: "raster",
    includedBecause:
      "Provider-neutral fallback path for domestic CDN or self-hosted tile experiments; search and routing are intentionally out of scope.",
    requiredEnv: ["NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE"],
    capabilities: [
      "mapInitialLoad",
      "tileRendering",
      "wgs84PinAccuracy",
      "markerDisplay",
      "mobileInteraction",
      "staticPlaceholder"
    ],
    productionCandidate: false
  },
  {
    id: "fallback-list",
    label: "List-only fallback",
    kind: "fallback",
    includedBecause:
      "Product resilience baseline: users must still browse places when map tiles, search, or routing are unavailable.",
    requiredEnv: [],
    capabilities: ["fallbackList", "staticPlaceholder", "externalNavigation"],
    productionCandidate: false
  }
];

export const mapPocProviderEnvValues: Record<string, string | undefined> = {
  NEXT_PUBLIC_MAP_POC_AMAP_KEY: process.env.NEXT_PUBLIC_MAP_POC_AMAP_KEY,
  NEXT_PUBLIC_MAP_POC_AMAP_SECURITY_CODE:
    process.env.NEXT_PUBLIC_MAP_POC_AMAP_SECURITY_CODE,
  NEXT_PUBLIC_MAP_POC_TENCENT_KEY: process.env.NEXT_PUBLIC_MAP_POC_TENCENT_KEY,
  NEXT_PUBLIC_MAP_POC_TENCENT_WEBSERVICE_KEY:
    process.env.NEXT_PUBLIC_MAP_POC_TENCENT_WEBSERVICE_KEY,
  NEXT_PUBLIC_MAP_POC_BAIDU_AK: process.env.NEXT_PUBLIC_MAP_POC_BAIDU_AK,
  NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE:
    process.env.NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE,
  NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE:
    process.env.NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE
};

export function hasRequiredMapPocEnv(provider: MapProvider): boolean {
  return provider.requiredEnv.every((key) => Boolean(mapPocProviderEnvValues[key]));
}
