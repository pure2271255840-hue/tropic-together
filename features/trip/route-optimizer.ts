import { coordinateFromMapUrl } from "./navigation-links";
import type {
  AiItineraryDayDraft,
  AiItineraryDraft,
  AiItineraryItemDraft,
  Coordinate,
  ItineraryVersion,
  TravelPlace
} from "./types";

type RouteCandidate = {
  item: AiItineraryItemDraft;
  coordinate: Coordinate;
  originalIndex: number;
};

type OptimizeAiItineraryDraftInput = {
  places: TravelPlace[];
  hotelAddress?: string;
  hotelMapUrl?: string;
  currentVersion?: ItineraryVersion;
};

const earthRadiusKm = 6371;

function normalizeLookupText(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function coordinateFromTextPair(value?: string) {
  const match = value
    ?.trim()
    .match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return undefined;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
    ? { lat, lng }
    : undefined;
}

function coordinateForHotel(hotelAddress?: string, hotelMapUrl?: string) {
  return (
    coordinateFromMapUrl(hotelMapUrl) ??
    coordinateFromMapUrl(hotelAddress) ??
    coordinateFromTextPair(hotelAddress)
  );
}

function coordinateForPlace(place: TravelPlace) {
  return place.coordinate ?? coordinateFromMapUrl(place.mapUrl);
}

function buildPlaceLookup(places: TravelPlace[]) {
  const lookup = new Map<string, TravelPlace>();

  for (const place of places) {
    const keys = [
      normalizeLookupText(place.name),
      normalizeLookupText(place.name.split(/\s+/)[0])
    ].filter(Boolean);

    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, place);
      }
    }
  }

  return lookup;
}

function placeForDraftItem(
  item: AiItineraryItemDraft,
  placeLookup: Map<string, TravelPlace>
) {
  const keys = [
    normalizeLookupText(item.placeName),
    normalizeLookupText(item.title)
  ].filter(Boolean);

  for (const key of keys) {
    const place = placeLookup.get(key);

    if (place) {
      return place;
    }
  }

  return undefined;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(left: Coordinate, right: Coordinate) {
  const latDistance = toRadians(right.lat - left.lat);
  const lngDistance = toRadians(right.lng - left.lng);
  const leftLat = toRadians(left.lat);
  const rightLat = toRadians(right.lat);
  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lngDistance / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function routeDistance(route: RouteCandidate[], startCoordinate?: Coordinate) {
  let totalDistance = 0;
  let previousCoordinate = startCoordinate;

  for (const candidate of route) {
    if (previousCoordinate) {
      totalDistance += distanceKm(previousCoordinate, candidate.coordinate);
    }

    previousCoordinate = candidate.coordinate;
  }

  return totalDistance;
}

function nearestCandidate(
  candidates: RouteCandidate[],
  currentCoordinate: Coordinate
) {
  return candidates.reduce((best, candidate) =>
    distanceKm(currentCoordinate, candidate.coordinate) <
    distanceKm(currentCoordinate, best.coordinate)
      ? candidate
      : best
  );
}

function nearestNeighborFromSeed(
  candidates: RouteCandidate[],
  seed: RouteCandidate
) {
  const route = [seed];
  const remaining = candidates.filter((candidate) => candidate !== seed);
  let currentCoordinate = seed.coordinate;

  while (remaining.length > 0) {
    const nextCandidate = nearestCandidate(remaining, currentCoordinate);

    route.push(nextCandidate);
    remaining.splice(remaining.indexOf(nextCandidate), 1);
    currentCoordinate = nextCandidate.coordinate;
  }

  return route;
}

function nearestNeighbor(
  candidates: RouteCandidate[],
  startCoordinate?: Coordinate
) {
  if (startCoordinate) {
    const seed = nearestCandidate(candidates, startCoordinate);

    return nearestNeighborFromSeed(candidates, seed);
  }

  return candidates
    .map((candidate) => nearestNeighborFromSeed(candidates, candidate))
    .sort((left, right) => routeDistance(left) - routeDistance(right))[0];
}

function twoOpt(route: RouteCandidate[], startCoordinate?: Coordinate) {
  let bestRoute = route;
  let bestDistance = routeDistance(bestRoute, startCoordinate);
  let improved = true;
  let guard = 0;

  while (improved && guard < 20) {
    improved = false;
    guard += 1;

    for (let left = 0; left < bestRoute.length - 1; left += 1) {
      for (let right = left + 1; right < bestRoute.length; right += 1) {
        const candidateRoute = [
          ...bestRoute.slice(0, left),
          ...bestRoute.slice(left, right + 1).reverse(),
          ...bestRoute.slice(right + 1)
        ];
        const candidateDistance = routeDistance(candidateRoute, startCoordinate);

        if (candidateDistance + 0.001 < bestDistance) {
          bestRoute = candidateRoute;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

function optimizedCandidateOrder(
  candidates: RouteCandidate[],
  startCoordinate?: Coordinate
) {
  if (candidates.length < 2) {
    return candidates;
  }

  return twoOpt(nearestNeighbor(candidates, startCoordinate), startCoordinate);
}

function dayHasLockedItems(
  currentVersion: ItineraryVersion | undefined,
  date: string
) {
  return Boolean(
    currentVersion?.days
      .find((day) => day.date === date)
      ?.items.some((item) => item.isLocked)
  );
}

function optimizeDayRoute(
  day: AiItineraryDayDraft,
  placeLookup: Map<string, TravelPlace>,
  startCoordinate?: Coordinate,
  currentVersion?: ItineraryVersion
) {
  if (dayHasLockedItems(currentVersion, day.date)) {
    return day;
  }

  const candidates = day.items.flatMap((item, originalIndex) => {
    const place = placeForDraftItem(item, placeLookup);
    const coordinate = place ? coordinateForPlace(place) : undefined;

    return coordinate ? [{ item, coordinate, originalIndex }] : [];
  });

  if (candidates.length < 2) {
    return day;
  }

  const candidateIndexes = new Set(
    candidates.map((candidate) => candidate.originalIndex)
  );
  const optimizedItems = optimizedCandidateOrder(candidates, startCoordinate);
  let optimizedIndex = 0;

  return {
    ...day,
    items: day.items.map((slotItem, itemIndex) => {
      if (!candidateIndexes.has(itemIndex)) {
        return slotItem;
      }

      const optimizedItem = optimizedItems[optimizedIndex].item;
      optimizedIndex += 1;

      return {
        ...optimizedItem,
        startTime: slotItem.startTime,
        endTime: slotItem.endTime
      };
    })
  };
}

export function optimizeAiItineraryDraftRoute(
  draft: AiItineraryDraft,
  input: OptimizeAiItineraryDraftInput
): AiItineraryDraft {
  const placeLookup = buildPlaceLookup(input.places);
  const hotelCoordinate = coordinateForHotel(
    input.hotelAddress,
    input.hotelMapUrl
  );

  return {
    ...draft,
    days: draft.days.map((day) =>
      optimizeDayRoute(
        day,
        placeLookup,
        hotelCoordinate,
        input.currentVersion
      )
    )
  };
}
