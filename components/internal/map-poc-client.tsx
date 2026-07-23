"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  ListChecks,
  LocateFixed,
  MapPinned,
  RefreshCw,
  Route,
  Search
} from "lucide-react";
import {
  hasRequiredMapPocEnv,
  mapPocProviderEnvValues,
  mapPocProviders
} from "@/lib/map-poc/providers";
import { mapPocRouteRequests, mapPocTestPlaces } from "@/lib/map-poc/test-data";
import type {
  Coordinate,
  MapPocResult,
  MapProvider,
  NetworkCondition,
  PlaceSearchResult,
  PocTestStatus,
  RouteRequest,
  RouteResult,
  TestPlace
} from "@/lib/map-poc/types";

declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
    TMap?: any;
    BMap?: any;
    __tropicMapPocBaiduInit?: () => void;
  }
}

type ViewMode = "interactive" | "list" | "static" | "external" | "unavailable";

const networkConditions: NetworkCondition[] = [
  "Mainland China / no VPN",
  "Mainland China / VPN",
  "Overseas"
];

const defaultCenter: Coordinate = { lat: 5.55, lng: 108.2, system: "wgs84" };
const viewModes: ViewMode[] = ["interactive", "list", "static", "external", "unavailable"];

const providerLabels: Record<string, string> = {
  amap: "高德地图",
  tencent: "腾讯地图",
  baidu: "百度地图",
  raster: "自定义瓦片",
  "fallback-list": "列表兜底"
};

const providerReasonLabels: Record<string, string> = {
  amap: "国内可访问候选方；本 POC 用来验证马来西亚地点搜索、路线规划、瓦片和移动端交互是否可用。",
  tencent: "国内可访问候选方；本 POC 重点验证腾讯地图在马来西亚目的地、路线和移动端场景下的覆盖能力。",
  baidu: "国内可访问基线；用于提前暴露坐标系和马来西亚覆盖风险。",
  raster: "供应商无关的瓦片兜底路径；搜索和路线规划不在这个模式内验证。",
  "fallback-list": "产品韧性基线；当地图瓦片、搜索或路线不可用时，用户仍应能浏览地点列表。"
};

const networkConditionLabels: Record<NetworkCondition, string> = {
  "Mainland China / no VPN": "中国大陆 / 无 VPN",
  "Mainland China / VPN": "中国大陆 / 有 VPN",
  Overseas: "海外网络"
};

const viewModeLabels: Record<ViewMode, string> = {
  interactive: "交互地图",
  list: "列表兜底",
  static: "静态地图",
  external: "外部导航",
  unavailable: "不可用状态"
};

const placeNameLabels: Record<string, string> = {
  "George Town": "乔治市 (George Town)",
  "Armenian Street": "亚美尼亚街 (Armenian Street)",
  "Chew Jetty": "姓周桥 (Chew Jetty)",
  "Kek Lok Si Temple": "极乐寺 (Kek Lok Si Temple)",
  "ChinaHouse Penang": "ChinaHouse 槟城",
  "Kota Kinabalu Waterfront": "亚庇海滨 (Kota Kinabalu Waterfront)",
  "Jesselton Point": "杰瑟尔顿码头 (Jesselton Point)",
  "Tanjung Aru Beach": "丹绒亚路海滩 (Tanjung Aru Beach)",
  "Gaya Street": "加雅街 (Gaya Street)",
  "Kota Kinabalu International Airport": "亚庇国际机场 (Kota Kinabalu International Airport)"
};

const routeLabels: Record<string, string> = {
  "penang-heritage-walk": "乔治市 -> 亚美尼亚街 -> 姓周桥",
  "kk-coastal-route": "杰瑟尔顿码头 -> 加雅街 -> 丹绒亚路海滩"
};

const cityLabels: Record<TestPlace["city"], string> = {
  penang: "槟城",
  "kota-kinabalu": "亚庇"
};

function createInitialResult(
  providerId: string,
  networkCondition: NetworkCondition,
  manualTesterNotes = ""
): MapPocResult {
  return {
    selectedProvider: providerId,
    mapLoaded: "not-run",
    tileRendering: "not-run",
    wgs84PinAccuracy: "not-run",
    markerDisplay: "not-run",
    placeSearch: "not-run",
    routeCalculation: "not-run",
    mobileInteraction: "not-run",
    visibleErrors: [],
    manualTesterNotes,
    timestamp: "",
    networkCondition
  };
}

function loadScript(src: string, id: string, callbackName?: "__tropicMapPocBaiduInit") {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error(`加载 ${id} 超时。`));
    }, 15000);

    if (callbackName) {
      window[callbackName] = () => {
        window.clearTimeout(timeout);
        resolve();
      };
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = () => {
      if (!callbackName) {
        window.clearTimeout(timeout);
        resolve();
      }
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error(`加载 ${id} 失败。`));
    };
    document.head.appendChild(script);
  });
}

function loadJsonp(src: string) {
  return new Promise<any>((resolve, reject) => {
    const callbackName = `__tropicMapPocJsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const separator = src.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("腾讯地图 WebService JSONP 响应超时。"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      script.remove();
    }

    (window as any)[callbackName] = (response: any) => {
      cleanup();
      resolve(response);
    };

    script.async = true;
    script.src = `${src}${separator}output=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("腾讯地图 WebService JSONP 响应加载失败。"));
    };
    document.head.appendChild(script);
  });
}

function statusLabel(status: PocTestStatus) {
  switch (status) {
    case "passed":
      return "已通过";
    case "failed":
      return "未通过";
    case "running":
      return "测试中";
    case "unsupported":
      return "不支持";
    default:
      return "未测试";
  }
}

function statusClass(status: PocTestStatus) {
  switch (status) {
    case "passed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "failed":
      return "border-red-200 bg-red-50 text-red-800";
    case "running":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "unsupported":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-stone-200 bg-white text-stone-600";
  }
}

function formatCoordinate(coordinate: Coordinate) {
  return `${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)} (${coordinate.system})`;
}

function formatPlaceAddress(item: PlaceSearchResult) {
  if (item.address) {
    return item.address;
  }

  if (item.city) {
    return `未返回详细地址；仅返回行政区：${item.city}`;
  }

  if (item.coordinate) {
    return `未返回详细地址；仅返回坐标：${formatCoordinate(item.coordinate)}`;
  }

  return "未返回详细地址";
}

function formatProviderLabel(provider: MapProvider) {
  return providerLabels[provider.id] ?? provider.label;
}

function formatProviderReason(provider: MapProvider) {
  return providerReasonLabels[provider.id] ?? provider.includedBecause;
}

function formatPlaceName(place: Pick<TestPlace, "name"> | PlaceSearchResult) {
  return placeNameLabels[place.name] ?? place.name;
}

function formatRouteLabel(routeRequest: RouteRequest) {
  return routeLabels[routeRequest.id] ?? routeRequest.label;
}

function formatPlaceCity(place: TestPlace) {
  return cityLabels[place.city] ?? place.city;
}

function formatDistance(distanceMeters?: number) {
  if (!Number.isFinite(distanceMeters)) {
    return "未返回";
  }

  if ((distanceMeters ?? 0) >= 1000) {
    return `${((distanceMeters ?? 0) / 1000).toFixed(1)} 公里`;
  }

  return `${Math.round(distanceMeters ?? 0)} 米`;
}

function formatDuration(durationSeconds?: number) {
  if (!Number.isFinite(durationSeconds)) {
    return "未返回";
  }

  return `${Math.round((durationSeconds ?? 0) / 60)} 分钟`;
}

function formatTimestamp(value: string) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "未记录";
}

function amapErrorDetail(response: any) {
  const info = response?.info ?? response?.message ?? response?.infocode;

  return info ? ` (${String(info)})` : "";
}

function tencentErrorDetail(scope: string, error: unknown) {
  const source =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : undefined;
  const status = source?.status ?? source?.code ?? source?.errCode;
  const message =
    source?.message ?? source?.msg ?? source?.detail ?? source?.error ?? error;
  const details = [status ? `状态码 ${String(status)}` : "", message ? String(message) : ""]
    .filter(Boolean)
    .join("：");
  const statusNumber = Number(status);
  const statusHint =
    statusNumber === 348
      ? "；含义：腾讯路线服务没有接受这组起终点坐标。若坐标在马来西亚，通常需要确认海外版/海外路线服务权限，当前国内 WebService 通道不能证明路线可用。"
      : statusNumber === 121
        ? "；含义：这个 key 今日调用量已达到上限，需要等配额恢复或提高配额后再测。"
        : "";
  const suffix =
    /servicesk|signature|sig|签名|鉴权|key/i.test(details)
      ? " 这是浏览器 POC，只能使用公开 JavaScript API key；不要把服务端 secret 放进 NEXT_PUBLIC_*。"
      : "";

  return `腾讯地图${scope}失败${details ? `：${details}` : "。"}${statusHint}${suffix}`;
}

function tencentCoordinateFromLatLng(value: any): Coordinate | undefined {
  const lat = Number(value?.lat ?? value?.getLat?.());
  const lng = Number(value?.lng ?? value?.getLng?.());

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }

  return { lat, lng, system: "wgs84" };
}

function tencentLatLngFromCoordinate(coordinate: Coordinate) {
  return new window.TMap.LatLng(coordinate.lat, coordinate.lng);
}

function tencentCoordinateString(coordinate: Coordinate) {
  return `${coordinate.lat},${coordinate.lng}`;
}

function tencentRectangleBoundary(center: Coordinate, delta: number) {
  return `rectangle(${center.lat - delta},${center.lng - delta},${center.lat + delta},${
    center.lng + delta
  })`;
}

function tencentWebServiceKey() {
  return (
    mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_TENCENT_WEBSERVICE_KEY ??
    mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_TENCENT_KEY
  );
}

function tencentWebServiceUrl(path: string, params: Record<string, string | undefined>) {
  const key = tencentWebServiceKey();

  if (!key) {
    throw new Error("腾讯地图 WebService key 不可用，无法运行这个 POC 诊断。");
  }

  const url = new URL(path, "https://apis.map.qq.com");
  url.searchParams.set("key", key);

  Object.entries(params).forEach(([name, value]) => {
    if (value) {
      url.searchParams.set(name, value);
    }
  });

  return url.toString();
}

function tencentFormattedAddress(item: any) {
  const adInfo = item?.ad_info ?? item?.adInfo;
  const administrativeAddress = [
    item?.province ?? adInfo?.province,
    item?.city ?? adInfo?.city,
    item?.district ?? adInfo?.district
  ]
    .filter(Boolean)
    .join(" / ");

  return item?.address ?? item?.addr ?? (administrativeAddress || undefined);
}

function tencentPlaceSearchResult(item: any, providerId = "tencent"): PlaceSearchResult {
  return {
    providerId,
    placeId: item.id,
    name: item.title ?? item.name,
    address: tencentFormattedAddress(item),
    city:
      item.city ??
      item.district ??
      item.ad_info?.city ??
      item.adInfo?.city ??
      item.ad_info?.district ??
      item.adInfo?.district,
    coordinate: item.location ? tencentCoordinateFromLatLng(item.location) : undefined,
    rawConfidence: "medium"
  };
}

function tencentDecodeCompressedPolyline(rawPath: any[]): Coordinate[] {
  const values = rawPath.map(Number);

  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
    return [];
  }

  for (let index = 2; index < values.length; index += 1) {
    values[index] = values[index - 2] + values[index] / 1000000;
  }

  const path: Coordinate[] = [];

  for (let index = 0; index < values.length - 1; index += 2) {
    path.push({ lat: values[index], lng: values[index + 1], system: "wgs84" });
  }

  return path;
}

function tencentSearchReferencePlace(query: string) {
  const normalizedQuery = query.toLowerCase();

  return (
    mapPocTestPlaces.find((place) =>
      [place.name, place.searchQuery].some((value) =>
        normalizedQuery.includes(value.toLowerCase())
      )
    ) ??
    mapPocTestPlaces.find((place) =>
      place.searchQuery.toLowerCase().includes(normalizedQuery)
    )
  );
}

function tencentSearchCityName(query: string) {
  const normalizedQuery = query.toLowerCase();

  if (normalizedQuery.includes("kota kinabalu") || normalizedQuery.includes("sabah")) {
    return "Kota Kinabalu";
  }

  if (normalizedQuery.includes("penang") || normalizedQuery.includes("george town")) {
    return "Penang";
  }

  return "Malaysia";
}

function tencentSearchResults(response: any) {
  return response?.data ?? response?.result?.data ?? response?.result?.pois ?? response?.cluster ?? [];
}

function tencentRouteCandidates(response: any) {
  return response?.result?.routes ?? response?.data?.routes ?? response?.routes ?? [];
}

function tencentRoutePath(route: any): Coordinate[] {
  const rawPath = route?.polyline ?? route?.path ?? route?.paths ?? [];

  if (Array.isArray(rawPath) && rawPath.every((point) => typeof point === "number")) {
    return tencentDecodeCompressedPolyline(rawPath);
  }

  return rawPath
    .map((point: any) => tencentCoordinateFromLatLng(point))
    .filter((point: Coordinate | undefined): point is Coordinate => Boolean(point));
}

function routePlaces(routeRequest: RouteRequest) {
  return [routeRequest.origin, ...routeRequest.waypoints, routeRequest.destination];
}

function slippyTile(coordinate: Coordinate, zoom: number) {
  const latRad = (coordinate.lat * Math.PI) / 180;
  const scale = 2 ** zoom;

  return {
    x: ((coordinate.lng + 180) / 360) * scale,
    y:
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      scale
  };
}

function externalUrlForPlace(place: TestPlace) {
  const template =
    mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE ?? "";

  if (!template) {
    return "";
  }

  return template
    .replace("{lat}", String(place.coordinate.lat))
    .replace("{lng}", String(place.coordinate.lng))
    .replace("{name}", encodeURIComponent(place.name));
}

function StatusPill({ status }: { status: PocTestStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
      {icon}
      <span>{title}</span>
    </div>
  );
}

export function MapPocClient() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const tencentRouteOverlayRef = useRef<any>(null);

  const [selectedProviderId, setSelectedProviderId] = useState(mapPocProviders[0].id);
  const [networkCondition, setNetworkCondition] =
    useState<NetworkCondition>("Mainland China / no VPN");
  const [viewMode, setViewMode] = useState<ViewMode>("interactive");
  const [reloadCount, setReloadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState(mapPocTestPlaces[0].searchQuery);
  const [selectedRouteId, setSelectedRouteId] = useState(mapPocRouteRequests[0].id);
  const [manualNotes, setManualNotes] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [result, setResult] = useState<MapPocResult>(() =>
    createInitialResult(mapPocProviders[0].id, "Mainland China / no VPN")
  );

  const selectedProvider = useMemo(
    () => mapPocProviders.find((provider) => provider.id === selectedProviderId) ?? mapPocProviders[0],
    [selectedProviderId]
  );

  const selectedRoute = useMemo(
    () =>
      mapPocRouteRequests.find((routeRequest) => routeRequest.id === selectedRouteId) ??
      mapPocRouteRequests[0],
    [selectedRouteId]
  );

  const patchResult = useCallback((patch: Partial<MapPocResult>) => {
    setResult((current) => ({
      ...current,
      ...patch,
      timestamp: new Date().toISOString()
    }));
  }, []);

  const appendVisibleError = useCallback((message: string) => {
    setResult((current) => ({
      ...current,
      visibleErrors: [...current.visibleErrors, message],
      timestamp: new Date().toISOString()
    }));
  }, []);

  const markMobileInteraction = useCallback(() => {
    patchResult({ mobileInteraction: "passed" });
  }, [patchResult]);

  useEffect(() => {
    setResult(createInitialResult(selectedProviderId, networkCondition, manualNotes));
    setSearchResults([]);
    setRouteResult(null);
  }, [manualNotes, networkCondition, selectedProviderId]);

  useEffect(() => {
    patchResult({ manualTesterNotes: manualNotes, networkCondition });
  }, [manualNotes, networkCondition, patchResult]);

  useEffect(() => {
    if (viewMode !== "interactive") {
      return;
    }

    let cancelled = false;

    async function initialize() {
      const container = mapContainerRef.current;

      if (!container) {
        return;
      }

      cleanupRef.current?.();
      cleanupRef.current = null;
      mapInstanceRef.current = null;
      tencentRouteOverlayRef.current = null;
      container.innerHTML = "";

      if (selectedProvider.kind === "fallback") {
        patchResult({
          mapLoaded: "unsupported",
          tileRendering: "unsupported",
          markerDisplay: "unsupported",
          wgs84PinAccuracy: "unsupported"
        });
        return;
      }

      if (!hasRequiredMapPocEnv(selectedProvider)) {
        patchResult({
          mapLoaded: "failed",
          tileRendering: "failed",
          markerDisplay: "not-run",
          wgs84PinAccuracy: "not-run",
          visibleErrors: [
            `缺少环境变量：${selectedProvider.requiredEnv.join(", ")}`
          ]
        });
        return;
      }

      patchResult({
        mapLoaded: "running",
        tileRendering: "running",
        markerDisplay: "running",
        wgs84PinAccuracy: "running",
        visibleErrors: []
      });

      try {
        if (selectedProvider.kind === "amap") {
          await initializeAmap(container, selectedProvider);
        } else if (selectedProvider.kind === "tencent") {
          await initializeTencent(container, selectedProvider);
        } else if (selectedProvider.kind === "baidu") {
          await initializeBaidu(container, selectedProvider);
        } else if (selectedProvider.kind === "raster") {
          initializeRasterTiles(container);
        }

        if (!cancelled) {
          patchResult({
            mapLoaded: "passed",
            tileRendering: "passed",
            markerDisplay: "passed"
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "未知地图初始化错误。";
          patchResult({
            mapLoaded: "failed",
            tileRendering: "failed",
            markerDisplay: "failed",
            visibleErrors: [message]
          });
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // POC SDK probes are intentionally recreated with the selected provider state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markMobileInteraction, patchResult, reloadCount, selectedProvider, viewMode]);

  async function initializeAmap(container: HTMLDivElement, provider: MapProvider) {
    const key = mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_AMAP_KEY;
    const securityCode =
      mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_AMAP_SECURITY_CODE;

    window._AMapSecurityConfig = {
      securityJsCode: securityCode
    };

    await loadScript(
      `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
        key ?? ""
      )}&plugin=AMap.PlaceSearch,AMap.Driving`,
      "map-poc-amap"
    );

    if (!window.AMap) {
      throw new Error("高德地图 SDK 已加载，但 window.AMap 不可用。");
    }

    const map = new window.AMap.Map(container, {
      center: [100.333, 5.414],
      resizeEnable: true,
      viewMode: "2D",
      zoom: 12
    });

    mapInstanceRef.current = map;
    container.addEventListener("pointerdown", markMobileInteraction);
    cleanupRef.current = () => {
      container.removeEventListener("pointerdown", markMobileInteraction);
      map.destroy?.();
    };

    mapPocTestPlaces.forEach((place) => {
      const marker = new window.AMap.Marker({
        map,
        position: [place.coordinate.lng, place.coordinate.lat],
        title: place.name
      });
      marker.setLabel?.({ content: formatPlaceName(place), direction: "top" });
    });

    if (provider.id !== selectedProviderId) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 4000);
      map.on?.("complete", () => {
        window.clearTimeout(timeout);
        resolve();
      });
    });
  }

  async function initializeTencent(container: HTMLDivElement, provider: MapProvider) {
    const key = mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_TENCENT_KEY;

    try {
      await loadScript(
        `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(
          key ?? ""
        )}&libraries=service`,
        "map-poc-tencent"
      );
    } catch (error) {
      throw new Error(tencentErrorDetail("SDK 加载", error));
    }

    if (!window.TMap) {
      throw new Error("腾讯地图 SDK 已加载，但 window.TMap 不可用。");
    }

    const TMap = window.TMap;
    const map = new TMap.Map(container, {
      center: tencentLatLngFromCoordinate(defaultCenter),
      pitch: 0,
      zoom: 5
    });

    mapInstanceRef.current = map;
    container.addEventListener("pointerdown", markMobileInteraction);
    container.addEventListener("touchstart", markMobileInteraction);
    cleanupRef.current = () => {
      container.removeEventListener("pointerdown", markMobileInteraction);
      container.removeEventListener("touchstart", markMobileInteraction);
      tencentRouteOverlayRef.current?.destroy?.();
      tencentRouteOverlayRef.current = null;
      map.destroy?.();
    };

    new TMap.MultiMarker({
      geometries: mapPocTestPlaces.map((place) => ({
        id: place.id,
        position: tencentLatLngFromCoordinate(place.coordinate),
        properties: { title: formatPlaceName(place) }
      })),
      map
    });

    if (TMap.MultiLabel && TMap.LabelStyle) {
      new TMap.MultiLabel({
        geometries: mapPocTestPlaces.map((place) => ({
          id: `label-${place.id}`,
          styleId: "label",
          position: tencentLatLngFromCoordinate(place.coordinate),
          content: formatPlaceName(place)
        })),
        map,
        styles: {
          label: new TMap.LabelStyle({
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            borderRadius: 4,
            color: "#292524",
            fontSize: 12,
            offset: { x: 0, y: -34 },
            padding: "4px 6px"
          })
        }
      });
    }

    if (provider.id !== selectedProviderId) {
      return;
    }

    await new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (!resolved) {
          resolved = true;
          window.clearTimeout(timeout);
          resolve();
        }
      };
      const timeout = window.setTimeout(finish, 4000);

      map.on?.("tilesloaded", finish);
      map.on?.("idle", finish);
      window.setTimeout(() => {
        if (container.querySelector("canvas")) {
          finish();
        }
      }, 1200);
    });
  }

  async function initializeBaidu(container: HTMLDivElement, provider: MapProvider) {
    const key = mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_BAIDU_AK;

    await loadScript(
      `https://api.map.baidu.com/api?v=3.0&ak=${encodeURIComponent(
        key ?? ""
      )}&callback=__tropicMapPocBaiduInit`,
      "map-poc-baidu",
      "__tropicMapPocBaiduInit"
    );

    if (!window.BMap) {
      throw new Error("百度地图 SDK 已加载，但 window.BMap 不可用。");
    }

    const BMap = window.BMap;
    const map = new BMap.Map(container);
    const center = new BMap.Point(100.333, 5.414);
    map.centerAndZoom(center, 12);
    map.enableScrollWheelZoom?.();

    mapInstanceRef.current = map;
    container.addEventListener("pointerdown", markMobileInteraction);
    cleanupRef.current = () => {
      container.removeEventListener("pointerdown", markMobileInteraction);
      map.clearOverlays?.();
    };

    mapPocTestPlaces.forEach((place) => {
      const point = new BMap.Point(place.coordinate.lng, place.coordinate.lat);
      const marker = new BMap.Marker(point);
      map.addOverlay(marker);
      marker.setTitle?.(formatPlaceName(place));
    });

    if (provider.id !== selectedProviderId) {
      return;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 3000);
    });
  }

  function initializeRasterTiles(container: HTMLDivElement) {
    const template = mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE;

    if (!template) {
      throw new Error("缺少 NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE。");
    }

    const zoom = 11;
    const center = slippyTile(defaultCenter, zoom);
    const wrapper = document.createElement("div");
    wrapper.className = "relative h-full min-h-[440px] overflow-hidden rounded-lg bg-stone-200";
    container.appendChild(wrapper);

    let loadedTiles = 0;
    let failedTiles = 0;
    const totalTiles = 9;

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const x = Math.floor(center.x) + dx;
        const y = Math.floor(center.y) + dy;
        const img = document.createElement("img");
        img.alt = "";
        img.className = "absolute h-1/3 w-1/3 object-cover";
        img.style.left = `${(dx + 1) * 33.333}%`;
        img.style.top = `${(dy + 1) * 33.333}%`;
        img.src = template
          .replace("{z}", String(zoom))
          .replace("{x}", String(x))
          .replace("{y}", String(y));
        img.onload = () => {
          loadedTiles += 1;
          if (loadedTiles === 1) {
            patchResult({ tileRendering: "passed", mapLoaded: "passed" });
          }
        };
        img.onerror = () => {
          failedTiles += 1;
          if (failedTiles === totalTiles) {
            patchResult({
              tileRendering: "failed",
              visibleErrors: ["自定义瓦片模板没有成功加载任何瓦片。"]
            });
          }
        };
        wrapper.appendChild(img);
      }
    }

    const centerWorld = slippyTile(defaultCenter, zoom);
    mapPocTestPlaces.forEach((place) => {
      const world = slippyTile(place.coordinate, zoom);
      const marker = document.createElement("div");
      marker.className =
        "absolute h-3 w-3 rounded-full border-2 border-white bg-red-600 shadow";
      marker.title = formatPlaceName(place);
      marker.style.left = `${50 + (world.x - centerWorld.x) * 33.333}%`;
      marker.style.top = `${50 + (world.y - centerWorld.y) * 33.333}%`;
      wrapper.appendChild(marker);
    });

    wrapper.addEventListener("pointerdown", markMobileInteraction);
    cleanupRef.current = () => wrapper.removeEventListener("pointerdown", markMobileInteraction);
  }

  async function runPlaceSearch() {
    setSearchResults([]);

    if (!hasRequiredMapPocEnv(selectedProvider)) {
      patchResult({
        placeSearch: "failed",
        visibleErrors: [
          `无法运行地点搜索，缺少环境变量：${selectedProvider.requiredEnv.join(", ")}`
        ]
      });
      return;
    }

    patchResult({ placeSearch: "running" });

    try {
      if (selectedProvider.kind === "amap") {
        await runAmapSearch();
      } else if (selectedProvider.kind === "tencent") {
        await runTencentSearch();
      } else if (selectedProvider.kind === "baidu") {
        await runBaiduSearch();
      } else {
        patchResult({ placeSearch: "unsupported" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知地点搜索错误。";
      patchResult({ placeSearch: "failed" });
      appendVisibleError(message);
    }
  }

  async function runAmapSearch() {
    if (!window.AMap?.PlaceSearch) {
      throw new Error("高德地点搜索插件不可用。");
    }

    const search = new window.AMap.PlaceSearch({ pageSize: 5 });

    await new Promise<void>((resolve, reject) => {
      search.search(searchQuery, (status: string, response: any) => {
        if (status !== "complete") {
          reject(new Error(`高德地点搜索失败：${status}${amapErrorDetail(response)}`));
          return;
        }

        const pois = response?.poiList?.pois ?? [];
        setSearchResults(
          pois.slice(0, 5).map((poi: any) => ({
            providerId: "amap",
            placeId: poi.id,
            name: poi.name,
            address: poi.address,
            city: poi.cityname,
            coordinate: poi.location
              ? { lat: Number(poi.location.lat), lng: Number(poi.location.lng), system: "wgs84" }
              : undefined,
            rawConfidence: "medium"
          }))
        );
        patchResult({ placeSearch: pois.length > 0 ? "passed" : "failed" });
        resolve();
      });
    });
  }

  async function runTencentSearch() {
    const SearchCtor = window.TMap?.service?.Search;

    if (!SearchCtor) {
      throw new Error("腾讯地图 SDK 中未提供地点搜索服务。");
    }

    const service = new SearchCtor({ pageIndex: 1, pageSize: 5 });
    const cityName = tencentSearchCityName(searchQuery);
    const attempts: Array<() => Promise<any>> = [];

    if (typeof service.searchRegion === "function") {
      attempts.push(
        () =>
          service.searchRegion({
            keyword: searchQuery,
            region: cityName,
            autoExtend: true
          }),
        () =>
          service.searchRegion({
            keyword: searchQuery,
            region: "Malaysia",
            autoExtend: true
          })
      );
    }

    if (attempts.length === 0) {
      throw new Error("腾讯地图地点搜索服务未提供 searchRegion 方法。");
    }

    let data: any[] = [];
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        const status = response?.status ?? response?.result?.status;

        if (status && Number(status) !== 0) {
          throw response;
        }

        data = tencentSearchResults(response);

        if (data.length > 0) {
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (data.length === 0 && tencentWebServiceKey()) {
      data = await runTencentWebServiceSearch();
    }

    if (data.length === 0 && lastError) {
      throw new Error(tencentErrorDetail("地点搜索", lastError));
    }

    setSearchResults(data.slice(0, 5).map((item: any) => tencentPlaceSearchResult(item)));
    patchResult({
      placeSearch: data.length > 0 ? "passed" : "failed"
    });

    if (data.length === 0) {
      appendVisibleError(
        `腾讯地图地点搜索未返回马来西亚结果：${searchQuery}。JavaScript 服务和 WebService 诊断都没有拿到可用 POI。`
      );
    }
  }

  async function runTencentWebServiceSearch() {
    const referencePlace = tencentSearchReferencePlace(searchQuery);
    const keyword = referencePlace?.name ?? searchQuery;
    const cityName = tencentSearchCityName(searchQuery);
    const attempts = [
      { boundary: `region(${cityName},1)`, keyword },
      { boundary: "region(Malaysia,1)", keyword },
      referencePlace
        ? {
            boundary: `nearby(${tencentCoordinateString(referencePlace.coordinate)},5000,1)`,
            keyword
          }
        : undefined,
      referencePlace
        ? {
            boundary: tencentRectangleBoundary(referencePlace.coordinate, 0.08),
            keyword
          }
        : undefined
    ].filter(Boolean) as Array<{ boundary: string; keyword: string }>;
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        const response = await loadJsonp(
          tencentWebServiceUrl("/ws/place/v1/search", {
            boundary: attempt.boundary,
            keyword: attempt.keyword,
            page_size: "5",
            page_index: "1"
          })
        );
        const status = response?.status;

        if (status && Number(status) !== 0) {
          throw response;
        }

        const data = tencentSearchResults(response);

        if (data.length > 0) {
          return data;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw new Error(tencentErrorDetail("WebService 地点搜索", lastError));
    }

    return [];
  }

  async function runBaiduSearch() {
    if (!window.BMap?.LocalSearch) {
      throw new Error("百度 LocalSearch 不可用。");
    }

    await new Promise<void>((resolve, reject) => {
      const localSearch = new window.BMap.LocalSearch(mapInstanceRef.current, {
        onSearchComplete: (response: any) => {
          const count = localSearch.getResults?.()?.getCurrentNumPois?.() ?? 0;
          const items: PlaceSearchResult[] = [];

          for (let index = 0; index < count; index += 1) {
            const poi = response.getPoi(index);
            items.push({
              providerId: "baidu",
              placeId: poi.uid,
              name: poi.title,
              address: poi.address,
              city: poi.city,
              coordinate: poi.point
                ? { lat: Number(poi.point.lat), lng: Number(poi.point.lng), system: "wgs84" }
                : undefined,
              rawConfidence: "medium"
            });
          }

          setSearchResults(items);
          patchResult({ placeSearch: items.length > 0 ? "passed" : "failed" });
          resolve();
        }
      });

      try {
        localSearch.search(searchQuery);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function runRouteTest() {
    setRouteResult(null);

    if (!hasRequiredMapPocEnv(selectedProvider)) {
      patchResult({
        routeCalculation: "failed",
        visibleErrors: [`无法运行路线规划，缺少环境变量：${selectedProvider.requiredEnv.join(", ")}`]
      });
      return;
    }

    patchResult({ routeCalculation: "running" });

    try {
      if (selectedProvider.kind === "amap") {
        await runAmapRoute();
      } else if (selectedProvider.kind === "tencent") {
        await runTencentRoute();
      } else if (selectedProvider.kind === "baidu") {
        await runBaiduRoute();
      } else {
        patchResult({ routeCalculation: "unsupported" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知路线规划错误。";
      patchResult({ routeCalculation: "failed" });
      appendVisibleError(message);
    }
  }

  async function runAmapRoute() {
    if (!window.AMap?.Driving) {
      throw new Error("高德驾车路线插件不可用。");
    }

    const driving = new window.AMap.Driving({ map: mapInstanceRef.current });
    const points = routePlaces(selectedRoute).map(
      (place) => new window.AMap.LngLat(place.coordinate.lng, place.coordinate.lat)
    );

    await new Promise<void>((resolve, reject) => {
      driving.search(points, (status: string, response: any) => {
        if (status !== "complete") {
          reject(new Error(`高德路线规划失败：${status}${amapErrorDetail(response)}`));
          return;
        }

        const route = response?.routes?.[0];
        setRouteResult({
          providerId: "amap",
          routeId: selectedRoute.id,
          distanceMeters: route?.distance,
          durationSeconds: route?.time,
          summary: selectedRoute.label
        });
        patchResult({ routeCalculation: "passed" });
        resolve();
      });
    });
  }

  async function runTencentRoute() {
    const DrivingCtor = window.TMap?.service?.Driving;

    if (!DrivingCtor) {
      throw new Error("腾讯地图 SDK 中未提供驾车路线服务。");
    }

    const service = new DrivingCtor();
    let response: any;
    let jsRouteError: unknown;

    try {
      response = await service.search({
        from: tencentLatLngFromCoordinate(selectedRoute.origin.coordinate),
        to: tencentLatLngFromCoordinate(selectedRoute.destination.coordinate),
        waypoints: selectedRoute.waypoints.map(
          (place) => tencentLatLngFromCoordinate(place.coordinate)
        )
      });
    } catch (error) {
      jsRouteError = error;
    }

    const jsStatus = response?.status ?? response?.result?.status;

    if (!response || (jsStatus && Number(jsStatus) !== 0)) {
      response = await runTencentWebServiceRoute().catch((error: unknown) => {
        throw new Error(
          `${tencentErrorDetail(
            "路线计算",
            response ?? jsRouteError
          )} WebService 诊断也失败：${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
    }

    const status = response?.status ?? response?.result?.status;

    if (status && Number(status) !== 0) {
      throw new Error(tencentErrorDetail("路线计算", response));
    }

    const route = tencentRouteCandidates(response)[0];
    const path = tencentRoutePath(route);
    const durationMinutes = Number(route?.duration);

    tencentRouteOverlayRef.current?.destroy?.();
    tencentRouteOverlayRef.current = null;

    if (
      route &&
      path.length > 0 &&
      window.TMap?.MultiPolyline &&
      window.TMap?.PolylineStyle &&
      mapInstanceRef.current
    ) {
      const TMap = window.TMap;

      tencentRouteOverlayRef.current = new TMap.MultiPolyline({
        geometries: [
          {
            id: selectedRoute.id,
            paths: path.map((point) => tencentLatLngFromCoordinate(point)),
            styleId: "route"
          }
        ],
        map: mapInstanceRef.current,
        styles: {
          route: new TMap.PolylineStyle({
            borderColor: "#ffffff",
            borderWidth: 2,
            color: "#0f766e",
            lineCap: "round",
            width: 6
          })
        }
      });

      const midpoint = path[Math.floor(path.length / 2)];
      mapInstanceRef.current.setCenter?.(tencentLatLngFromCoordinate(midpoint));
      mapInstanceRef.current.setZoom?.(13);
    } else if (route && path.length === 0) {
      appendVisibleError("腾讯地图路线规划成功，但没有返回可绘制的路线线条。");
    } else if (route) {
      appendVisibleError(
        "腾讯地图路线规划成功，但当前 SDK 未暴露可绘制路线线条的类。"
      );
    }

    setRouteResult({
      providerId: "tencent",
      routeId: selectedRoute.id,
      distanceMeters: route?.distance,
      durationSeconds: Number.isFinite(durationMinutes) ? durationMinutes * 60 : undefined,
      path,
      summary: selectedRoute.label
    });
    patchResult({ routeCalculation: route ? "passed" : "failed" });

    if (!route) {
      appendVisibleError(`腾讯地图路线规划没有返回路线：${formatRouteLabel(selectedRoute)}。`);
    }
  }

  async function runTencentWebServiceRoute() {
    const baseParams = {
        from: tencentCoordinateString(selectedRoute.origin.coordinate),
        to: tencentCoordinateString(selectedRoute.destination.coordinate),
        policy: "LEAST_TIME"
    };
    const waypointParams = selectedRoute.waypoints.length
      ? {
          ...baseParams,
          waypoints: selectedRoute.waypoints
            .map((place) => tencentCoordinateString(place.coordinate))
            .join(";")
        }
      : baseParams;
    const attempts = [waypointParams, baseParams];
    let lastError: unknown;

    for (let index = 0; index < attempts.length; index += 1) {
      const params = attempts[index];

      try {
        const response = await loadJsonp(
          tencentWebServiceUrl("/ws/direction/v1/driving/", params)
        );
        const status = response?.status;

        if (status && Number(status) !== 0) {
          throw response;
        }

        if (index > 0 && selectedRoute.waypoints.length > 0) {
          appendVisibleError(
            "腾讯地图 WebService 去掉途经点后才成功；原始多点路线需要单独评估。"
          );
        }

        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(tencentErrorDetail("WebService 路线计算", lastError));
  }

  async function runBaiduRoute() {
    if (!window.BMap?.DrivingRoute) {
      throw new Error("百度 DrivingRoute 不可用。");
    }

    await new Promise<void>((resolve, reject) => {
      const route = new window.BMap.DrivingRoute(mapInstanceRef.current, {
        onSearchComplete: (response: any) => {
          const plan = response?.getPlan?.(0);

          setRouteResult({
            providerId: "baidu",
            routeId: selectedRoute.id,
            distanceMeters: plan?.getDistance?.(false),
            durationSeconds: undefined,
            summary: selectedRoute.label
          });
          patchResult({ routeCalculation: plan ? "passed" : "failed" });
          resolve();
        }
      });

      try {
        route.search(
          new window.BMap.Point(selectedRoute.origin.coordinate.lng, selectedRoute.origin.coordinate.lat),
          new window.BMap.Point(
            selectedRoute.destination.coordinate.lng,
            selectedRoute.destination.coordinate.lat
          ),
          {
            waypoints: selectedRoute.waypoints.map(
              (place) => new window.BMap.Point(place.coordinate.lng, place.coordinate.lat)
            )
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-amber-950">
              内部地图供应商 POC
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900">
              这是仅用于中国大陆可访问性验证的非生产测试页。它不修改现有旅行界面，
              不决定生产供应商；任何结论都需要在真实大陆移动网络下完成验证。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <SectionTitle icon={<MapPinned className="h-4 w-4" />} title="供应商测试控制" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-stone-700">当前供应商</span>
                <select
                  className="w-full rounded border bg-white px-3 py-2"
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                >
                  {mapPocProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {formatProviderLabel(provider)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-stone-700">网络环境</span>
                <select
                  className="w-full rounded border bg-white px-3 py-2"
                  value={networkCondition}
                  onChange={(event) => setNetworkCondition(event.target.value as NetworkCondition)}
                >
                  {networkConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {networkConditionLabels[condition]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {formatProviderReason(selectedProvider)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {viewModes.map((mode) => (
                <button
                  className={`min-h-10 rounded border px-3 py-2 text-center text-sm font-medium ${
                    viewMode === mode
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-stone-300 bg-white text-stone-700"
                  }`}
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  type="button"
                >
                  {viewModeLabels[mode]}
                </button>
              ))}
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                onClick={() => setReloadCount((count) => count + 1)}
                type="button"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                刷新
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            {viewMode === "interactive" ? (
              <div
                className="min-h-[440px] overflow-hidden rounded-lg border bg-stone-100"
                ref={mapContainerRef}
              />
            ) : null}

            {viewMode === "list" ? <ListOnlyFallback /> : null}
            {viewMode === "static" ? <StaticMapPlaceholder /> : null}
            {viewMode === "external" ? <ExternalNavigationPlaceholder /> : null}
            {viewMode === "unavailable" ? <MapUnavailableState /> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <SectionTitle icon={<Search className="h-4 w-4" />} title="地点搜索测试" />
              <label className="mt-3 block space-y-1 text-sm">
                <span className="font-medium text-stone-700">搜索词</span>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <button
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border border-teal-800 bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                onClick={() => void runPlaceSearch()}
                type="button"
              >
                <Search className="h-4 w-4" aria-hidden />
                运行地点搜索
              </button>
              <div className="mt-3 space-y-2">
                {searchResults.map((item) => (
                  <div className="rounded border p-2 text-sm" key={`${item.providerId}-${item.placeId ?? item.name}`}>
                    <div className="font-medium text-stone-900">{formatPlaceName(item)}</div>
                    <div className="text-stone-600">{formatPlaceAddress(item)}</div>
                    {item.coordinate ? (
                      <div className="text-xs text-stone-500">{formatCoordinate(item.coordinate)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <SectionTitle icon={<Route className="h-4 w-4" />} title="路线规划测试" />
              <label className="mt-3 block space-y-1 text-sm">
                <span className="font-medium text-stone-700">路线用例</span>
                <select
                  className="w-full rounded border bg-white px-3 py-2"
                  value={selectedRouteId}
                  onChange={(event) => setSelectedRouteId(event.target.value)}
                >
                  {mapPocRouteRequests.map((routeRequest) => (
                    <option key={routeRequest.id} value={routeRequest.id}>
                      {formatRouteLabel(routeRequest)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border border-teal-800 bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                onClick={() => void runRouteTest()}
                type="button"
              >
                <Route className="h-4 w-4" aria-hidden />
                运行路线规划
              </button>
              {selectedProvider.kind === "tencent" ? (
                <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                  若马来西亚路线返回状态码 348，表示当前腾讯路线接口没有接受这组海外起终点坐标；
                  这应记录为海外路线验证未通过，而不是前端把错误吞掉。
                </p>
              ) : null}
              <div className="mt-3 rounded border bg-stone-50 p-3 text-sm">
                <div className="font-medium text-stone-900">{formatRouteLabel(selectedRoute)}</div>
                <ol className="mt-2 space-y-1 text-stone-600">
                  {routePlaces(selectedRoute).map((place) => (
                    <li key={place.id}>{formatPlaceName(place)}</li>
                  ))}
                </ol>
                {routeResult ? (
                  <div className="mt-3 text-xs text-stone-600">
                    距离：{formatDistance(routeResult.distanceMeters)} / 时间：
                    {formatDuration(routeResult.durationSeconds)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <SectionTitle icon={<ListChecks className="h-4 w-4" />} title="POC 结果面板" />
            <dl className="mt-4 space-y-3 text-sm">
              <ResultRow label="当前供应商" value={formatProviderLabel(selectedProvider)} />
              <ResultRow label="地图加载" status={result.mapLoaded} />
              <ResultRow label="瓦片渲染" status={result.tileRendering} />
              <ResultRow label="WGS84 点位准确性" status={result.wgs84PinAccuracy} />
              <ResultRow label="Marker 显示" status={result.markerDisplay} />
              <ResultRow label="地点搜索" status={result.placeSearch} />
              <ResultRow label="路线规划" status={result.routeCalculation} />
              <ResultRow label="移动端交互" status={result.mobileInteraction} />
              <ResultRow label="网络环境" value={networkConditionLabels[result.networkCondition]} />
              <ResultRow
                label="测试时间"
                value={formatTimestamp(result.timestamp)}
              />
            </dl>

            <div className="mt-4 space-y-2">
              <label className="block text-sm">
                <span className="font-medium text-stone-700">人工检查 WGS84 点位</span>
                <select
                  className="mt-1 w-full rounded border bg-white px-3 py-2"
                  value={result.wgs84PinAccuracy}
                  onChange={(event) =>
                    patchResult({ wgs84PinAccuracy: event.target.value as PocTestStatus })
                  }
                >
                  <option value="not-run">未测试</option>
                  <option value="running">需要肉眼检查</option>
                  <option value="passed">看起来准确</option>
                  <option value="failed">有明显偏移/问题</option>
                </select>
              </label>
              <button
                className="min-h-10 rounded border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                onClick={markMobileInteraction}
                type="button"
              >
                标记移动端交互已通过
              </button>
            </div>

            <label className="mt-4 block text-sm">
              <span className="font-medium text-stone-700">人工测试备注</span>
              <textarea
                className="mt-1 min-h-28 w-full rounded border px-3 py-2"
                placeholder="记录中国大陆无 VPN 表现、瓦片慢、点位偏移、搜索漏结果、路线错误等..."
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
              />
            </label>

            <div className="mt-4">
              <div className="text-sm font-medium text-stone-700">可见错误信息</div>
              {result.visibleErrors.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {result.visibleErrors.map((error) => (
                    <li className="break-words rounded border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-800" key={error}>
                      {error}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded border bg-stone-50 p-2 text-xs text-stone-500">
                  暂无可见错误。
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <SectionTitle icon={<LocateFixed className="h-4 w-4" />} title="固定 WGS84 测试点" />
            <div className="mt-3 space-y-2">
              {mapPocTestPlaces.map((place) => (
                <div className="rounded border p-2 text-sm" key={place.id}>
                  <div className="font-medium text-stone-900">{formatPlaceName(place)}</div>
                  <div className="text-xs text-stone-500">{formatCoordinate(place.coordinate)}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ResultRow({
  label,
  status,
  value
}: {
  label: string;
  status?: PocTestStatus;
  value?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <dt className="min-w-0 text-stone-600">{label}</dt>
      <dd className="min-w-0 text-right text-stone-900">
        {status ? <StatusPill status={status} /> : value}
      </dd>
    </div>
  );
}

function ListOnlyFallback() {
  return (
    <div className="space-y-3">
      <SectionTitle icon={<ListChecks className="h-4 w-4" />} title="仅列表兜底原型" />
      <p className="text-sm text-stone-600">
        当地图瓦片或供应商 API 不可用时，用户仍然可以浏览分组后的地点列表。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {mapPocTestPlaces.map((place) => (
          <div className="rounded border bg-white p-3" key={place.id}>
            <div className="text-sm font-medium text-stone-900">{formatPlaceName(place)}</div>
            <div className="text-xs text-stone-500">{formatPlaceCity(place)}</div>
            <div className="mt-1 text-xs text-stone-500">{formatCoordinate(place.coordinate)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaticMapPlaceholder() {
  return (
    <div className="space-y-3">
      <SectionTitle icon={<MapPinned className="h-4 w-4" />} title="静态地图占位原型" />
      <div className="relative min-h-[360px] overflow-hidden rounded-lg border bg-[linear-gradient(135deg,#e8f2ee,#fff7e8)]">
        <div className="absolute left-[18%] top-[48%] rounded-full bg-teal-700 px-3 py-1 text-xs text-white">
          槟城地点组
        </div>
        <div className="absolute right-[15%] top-[36%] rounded-full bg-coral px-3 py-1 text-xs text-white">
          亚庇地点组
        </div>
        <div className="absolute bottom-4 left-4 max-w-sm rounded border bg-white/90 p-3 text-sm text-stone-700">
          如果实时地图失败，可以从自有域名提供静态图片或预渲染地图。
        </div>
      </div>
    </div>
  );
}

function ExternalNavigationPlaceholder() {
  return (
    <div className="space-y-3">
      <SectionTitle
        icon={<ExternalLink className="h-4 w-4" />}
        title="外部导航链接占位"
      />
      <p className="text-sm text-stone-600">
        可配置 <code>NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE</code>，使用
        <code>{"{lat}"}</code>、<code>{"{lng}"}</code>、<code>{"{name}"}</code> 作为占位符。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {mapPocTestPlaces.map((place) => {
          const url = externalUrlForPlace(place);

          return (
            <div className="rounded border bg-white p-3" key={place.id}>
              <div className="text-sm font-medium text-stone-900">{formatPlaceName(place)}</div>
              {url ? (
                <a
                  className="mt-2 inline-flex items-center gap-1 text-sm text-teal-700"
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  打开外部导航占位
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                <div className="mt-2 text-xs text-stone-500">未配置外部导航 URL 模板。</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapUnavailableState() {
  return (
    <div className="space-y-4">
      <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="地图不可用状态" />
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        地图当前不可用。下方仍保留地点浏览能力。
      </div>
      <ListOnlyFallback />
    </div>
  );
}


