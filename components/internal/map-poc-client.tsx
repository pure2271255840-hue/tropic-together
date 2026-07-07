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
    timestamp: new Date().toISOString(),
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
      reject(new Error(`Timed out loading ${id}`));
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
      reject(new Error(`Failed to load ${id}`));
    };
    document.head.appendChild(script);
  });
}

function statusLabel(status: PocTestStatus) {
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "running":
      return "running";
    case "unsupported":
      return "unsupported";
    default:
      return "not run";
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
            `Missing environment placeholder value: ${selectedProvider.requiredEnv.join(", ")}`
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
          const message = error instanceof Error ? error.message : "Unknown map initialization error";
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
  }, [patchResult, reloadCount, selectedProvider, viewMode]);

  async function initializeAmap(container: HTMLDivElement, provider: MapProvider) {
    const key = mapPocProviderEnvValues.NEXT_PUBLIC_MAP_POC_AMAP_KEY;

    await loadScript(
      `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
        key ?? ""
      )}&plugin=AMap.PlaceSearch,AMap.Driving`,
      "map-poc-amap"
    );

    if (!window.AMap) {
      throw new Error("AMap SDK loaded but window.AMap is unavailable.");
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
      marker.setLabel?.({ content: place.name, direction: "top" });
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

    await loadScript(
      `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(
        key ?? ""
      )}&libraries=service`,
      "map-poc-tencent"
    );

    if (!window.TMap) {
      throw new Error("Tencent Maps SDK loaded but window.TMap is unavailable.");
    }

    const TMap = window.TMap;
    const map = new TMap.Map(container, {
      center: new TMap.LatLng(defaultCenter.lat, defaultCenter.lng),
      zoom: 5
    });

    mapInstanceRef.current = map;
    container.addEventListener("pointerdown", markMobileInteraction);
    cleanupRef.current = () => {
      container.removeEventListener("pointerdown", markMobileInteraction);
      map.destroy?.();
    };

    new TMap.MultiMarker({
      geometries: mapPocTestPlaces.map((place) => ({
        id: place.id,
        position: new TMap.LatLng(place.coordinate.lat, place.coordinate.lng),
        properties: { title: place.name }
      })),
      map
    });

    if (provider.id !== selectedProviderId) {
      return;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 4000);
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
      throw new Error("Baidu Maps SDK loaded but window.BMap is unavailable.");
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
      marker.setTitle?.(place.name);
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
      throw new Error("Missing NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE.");
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
              visibleErrors: ["Raster tile template loaded zero tiles."]
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
      marker.title = place.name;
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
          `Cannot run place search; missing ${selectedProvider.requiredEnv.join(", ")}`
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
      const message = error instanceof Error ? error.message : "Unknown place search error";
      patchResult({ placeSearch: "failed", visibleErrors: [...result.visibleErrors, message] });
    }
  }

  async function runAmapSearch() {
    if (!window.AMap?.PlaceSearch) {
      throw new Error("AMap PlaceSearch plugin is unavailable.");
    }

    const search = new window.AMap.PlaceSearch({ pageSize: 5 });

    await new Promise<void>((resolve, reject) => {
      search.search(searchQuery, (status: string, response: any) => {
        if (status !== "complete") {
          reject(new Error(`AMap place search failed: ${status}`));
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
      throw new Error("Tencent Maps Search service is unavailable in the loaded SDK.");
    }

    const service = new SearchCtor({ pageSize: 5 });
    const center = new window.TMap.LatLng(defaultCenter.lat, defaultCenter.lng);
    const response =
      typeof service.searchRegion === "function"
        ? await service.searchRegion({ keyword: searchQuery, location: center, radius: 500000 })
        : await service.searchNearby({ keyword: searchQuery, location: center, radius: 500000 });
    const data = response?.data ?? response?.result?.data ?? [];

    setSearchResults(
      data.slice(0, 5).map((item: any) => ({
        providerId: "tencent",
        placeId: item.id,
        name: item.title ?? item.name,
        address: item.address,
        city: item.ad_info?.city,
        coordinate: item.location
          ? { lat: Number(item.location.lat), lng: Number(item.location.lng), system: "wgs84" }
          : undefined,
        rawConfidence: "medium"
      }))
    );
    patchResult({ placeSearch: data.length > 0 ? "passed" : "failed" });
  }

  async function runBaiduSearch() {
    if (!window.BMap?.LocalSearch) {
      throw new Error("Baidu LocalSearch is unavailable.");
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
        visibleErrors: [`Cannot run route test; missing ${selectedProvider.requiredEnv.join(", ")}`]
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
      const message = error instanceof Error ? error.message : "Unknown route error";
      patchResult({
        routeCalculation: "failed",
        visibleErrors: [...result.visibleErrors, message]
      });
    }
  }

  async function runAmapRoute() {
    if (!window.AMap?.Driving) {
      throw new Error("AMap Driving plugin is unavailable.");
    }

    const driving = new window.AMap.Driving({ map: mapInstanceRef.current });
    const points = routePlaces(selectedRoute).map(
      (place) => new window.AMap.LngLat(place.coordinate.lng, place.coordinate.lat)
    );

    await new Promise<void>((resolve, reject) => {
      driving.search(points, (status: string, response: any) => {
        if (status !== "complete") {
          reject(new Error(`AMap route calculation failed: ${status}`));
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
      throw new Error("Tencent Maps Driving service is unavailable in the loaded SDK.");
    }

    const service = new DrivingCtor();
    const response = await service.search({
      from: new window.TMap.LatLng(
        selectedRoute.origin.coordinate.lat,
        selectedRoute.origin.coordinate.lng
      ),
      to: new window.TMap.LatLng(
        selectedRoute.destination.coordinate.lat,
        selectedRoute.destination.coordinate.lng
      ),
      waypoints: selectedRoute.waypoints.map(
        (place) => new window.TMap.LatLng(place.coordinate.lat, place.coordinate.lng)
      )
    });
    const route = response?.result?.routes?.[0] ?? response?.data?.routes?.[0];

    setRouteResult({
      providerId: "tencent",
      routeId: selectedRoute.id,
      distanceMeters: route?.distance,
      durationSeconds: route?.duration,
      summary: selectedRoute.label
    });
    patchResult({ routeCalculation: route ? "passed" : "failed" });
  }

  async function runBaiduRoute() {
    if (!window.BMap?.DrivingRoute) {
      throw new Error("Baidu DrivingRoute is unavailable.");
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
              Internal Map Provider POC
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900">
              Non-production test surface for mainland-China accessibility. It does not modify
              the existing trip UI, does not choose a production provider, and should be validated
              on real mainland mobile networks before any recommendation.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <SectionTitle icon={<MapPinned className="h-4 w-4" />} title="Provider test controls" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-stone-700">Selected provider</span>
                <select
                  className="w-full rounded border bg-white px-3 py-2"
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                >
                  {mapPocProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-stone-700">Network condition</span>
                <select
                  className="w-full rounded border bg-white px-3 py-2"
                  value={networkCondition}
                  onChange={(event) => setNetworkCondition(event.target.value as NetworkCondition)}
                >
                  {networkConditions.map((condition) => (
                    <option key={condition}>{condition}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {selectedProvider.includedBecause}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["interactive", "list", "static", "external", "unavailable"] as ViewMode[]).map(
                (mode) => (
                  <button
                    className={`rounded border px-3 py-2 text-sm ${
                      viewMode === mode
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-stone-300 bg-white text-stone-700"
                    }`}
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    type="button"
                  >
                    {mode}
                  </button>
                )
              )}
              <button
                className="inline-flex items-center gap-2 rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
                onClick={() => setReloadCount((count) => count + 1)}
                type="button"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                reload
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
              <SectionTitle icon={<Search className="h-4 w-4" />} title="Place search test" />
              <label className="mt-3 block space-y-1 text-sm">
                <span className="font-medium text-stone-700">Search query</span>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <button
                className="mt-3 rounded bg-teal-700 px-3 py-2 text-sm font-medium text-white"
                onClick={() => void runPlaceSearch()}
                type="button"
              >
                Run place search
              </button>
              <div className="mt-3 space-y-2">
                {searchResults.map((item) => (
                  <div className="rounded border p-2 text-sm" key={`${item.providerId}-${item.placeId ?? item.name}`}>
                    <div className="font-medium text-stone-900">{item.name}</div>
                    <div className="text-stone-600">{item.address ?? "No address returned"}</div>
                    {item.coordinate ? (
                      <div className="text-xs text-stone-500">{formatCoordinate(item.coordinate)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <SectionTitle icon={<Route className="h-4 w-4" />} title="Route calculation test" />
              <label className="mt-3 block space-y-1 text-sm">
                <span className="font-medium text-stone-700">Route case</span>
                <select
                  className="w-full rounded border bg-white px-3 py-2"
                  value={selectedRouteId}
                  onChange={(event) => setSelectedRouteId(event.target.value)}
                >
                  {mapPocRouteRequests.map((routeRequest) => (
                    <option key={routeRequest.id} value={routeRequest.id}>
                      {routeRequest.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="mt-3 rounded bg-teal-700 px-3 py-2 text-sm font-medium text-white"
                onClick={() => void runRouteTest()}
                type="button"
              >
                Run route test
              </button>
              <div className="mt-3 rounded border bg-stone-50 p-3 text-sm">
                <div className="font-medium text-stone-900">{selectedRoute.label}</div>
                <ol className="mt-2 space-y-1 text-stone-600">
                  {routePlaces(selectedRoute).map((place) => (
                    <li key={place.id}>{place.name}</li>
                  ))}
                </ol>
                {routeResult ? (
                  <div className="mt-3 text-xs text-stone-600">
                    Distance: {routeResult.distanceMeters ?? "not returned"} / Duration:{" "}
                    {routeResult.durationSeconds ?? "not returned"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <SectionTitle icon={<ListChecks className="h-4 w-4" />} title="POC results panel" />
            <dl className="mt-4 space-y-3 text-sm">
              <ResultRow label="selected provider" value={selectedProvider.label} />
              <ResultRow label="map loaded" status={result.mapLoaded} />
              <ResultRow label="tile rendering" status={result.tileRendering} />
              <ResultRow label="WGS84 pin accuracy" status={result.wgs84PinAccuracy} />
              <ResultRow label="marker display" status={result.markerDisplay} />
              <ResultRow label="place search" status={result.placeSearch} />
              <ResultRow label="route calculation" status={result.routeCalculation} />
              <ResultRow label="mobile interaction" status={result.mobileInteraction} />
              <ResultRow label="network condition" value={result.networkCondition} />
              <ResultRow label="timestamp" value={new Date(result.timestamp).toLocaleString()} />
            </dl>

            <div className="mt-4 space-y-2">
              <label className="block text-sm">
                <span className="font-medium text-stone-700">Manual WGS84 pin check</span>
                <select
                  className="mt-1 w-full rounded border bg-white px-3 py-2"
                  value={result.wgs84PinAccuracy}
                  onChange={(event) =>
                    patchResult({ wgs84PinAccuracy: event.target.value as PocTestStatus })
                  }
                >
                  <option value="not-run">not run</option>
                  <option value="running">needs visual check</option>
                  <option value="passed">looks accurate</option>
                  <option value="failed">visible offset/problem</option>
                </select>
              </label>
              <button
                className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
                onClick={markMobileInteraction}
                type="button"
              >
                Mark mobile interaction passed
              </button>
            </div>

            <label className="mt-4 block text-sm">
              <span className="font-medium text-stone-700">Manual tester notes</span>
              <textarea
                className="mt-1 min-h-28 w-full rounded border px-3 py-2"
                placeholder="Record mainland no-VPN behavior, slow tiles, wrong pins, search misses, route errors..."
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
              />
            </label>

            <div className="mt-4">
              <div className="text-sm font-medium text-stone-700">Visible error messages</div>
              {result.visibleErrors.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {result.visibleErrors.map((error) => (
                    <li className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800" key={error}>
                      {error}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded border bg-stone-50 p-2 text-xs text-stone-500">
                  No visible errors recorded.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <SectionTitle icon={<LocateFixed className="h-4 w-4" />} title="Fixed WGS84 test pins" />
            <div className="mt-3 space-y-2">
              {mapPocTestPlaces.map((place) => (
                <div className="rounded border p-2 text-sm" key={place.id}>
                  <div className="font-medium text-stone-900">{place.name}</div>
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
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-600">{label}</dt>
      <dd className="text-right text-stone-900">{status ? <StatusPill status={status} /> : value}</dd>
    </div>
  );
}

function ListOnlyFallback() {
  return (
    <div className="space-y-3">
      <SectionTitle icon={<ListChecks className="h-4 w-4" />} title="List-only fallback prototype" />
      <p className="text-sm text-stone-600">
        Users can still browse grouped places when map tiles or provider APIs are unavailable.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {mapPocTestPlaces.map((place) => (
          <div className="rounded border bg-white p-3" key={place.id}>
            <div className="text-sm font-medium text-stone-900">{place.name}</div>
            <div className="text-xs text-stone-500">{place.city}</div>
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
      <SectionTitle icon={<MapPinned className="h-4 w-4" />} title="Static-map placeholder prototype" />
      <div className="relative min-h-[360px] overflow-hidden rounded-lg border bg-[linear-gradient(135deg,#e8f2ee,#fff7e8)]">
        <div className="absolute left-[18%] top-[48%] rounded-full bg-teal-700 px-3 py-1 text-xs text-white">
          Penang cluster
        </div>
        <div className="absolute right-[15%] top-[36%] rounded-full bg-coral px-3 py-1 text-xs text-white">
          Kota Kinabalu cluster
        </div>
        <div className="absolute bottom-4 left-4 max-w-sm rounded border bg-white/90 p-3 text-sm text-stone-700">
          Static image or pre-rendered map can be served from our own domain if live maps fail.
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
        title="External-navigation-link placeholder"
      />
      <p className="text-sm text-stone-600">
        Configure <code>NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE</code> with placeholders
        like <code>{"{lat}"}</code>, <code>{"{lng}"}</code>, and <code>{"{name}"}</code>.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {mapPocTestPlaces.map((place) => {
          const url = externalUrlForPlace(place);

          return (
            <div className="rounded border bg-white p-3" key={place.id}>
              <div className="text-sm font-medium text-stone-900">{place.name}</div>
              {url ? (
                <a
                  className="mt-2 inline-flex items-center gap-1 text-sm text-teal-700"
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open navigation placeholder
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                <div className="mt-2 text-xs text-stone-500">External URL template not configured.</div>
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
      <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="Map unavailable state" />
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Map is unavailable. Place browsing remains available below.
      </div>
      <ListOnlyFallback />
    </div>
  );
}


