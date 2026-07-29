import type { Coordinate, TravelPlace } from "./types";

export type MapDestination = Pick<
  TravelPlace,
  "name" | "address" | "city" | "coordinate" | "mapUrl"
>;

export function normalizedMapUrl(value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  try {
    const url = new URL(trimmedValue);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function validCoordinate(lat: number, lng: number): Coordinate | undefined {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return undefined;
  }

  return { lat, lng };
}

function coordinateFromPair(value?: string | null) {
  const match = value
    ?.trim()
    .match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return undefined;
  }

  return validCoordinate(Number(match[1]), Number(match[2]));
}

function coordinateFromUrlText(value: string) {
  const atCoordinate = value.match(
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:[,/]|$)/
  );

  if (atCoordinate) {
    return validCoordinate(Number(atCoordinate[1]), Number(atCoordinate[2]));
  }

  const googlePlaceCoordinate = value.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
  );

  if (googlePlaceCoordinate) {
    return validCoordinate(
      Number(googlePlaceCoordinate[1]),
      Number(googlePlaceCoordinate[2])
    );
  }

  return undefined;
}

function safeDecodeUrlText(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function coordinateFromMapUrl(value?: string) {
  const mapUrl = normalizedMapUrl(value);

  if (!mapUrl) {
    return undefined;
  }

  const decodedUrl = safeDecodeUrlText(mapUrl);
  const textCoordinate = coordinateFromUrlText(decodedUrl);

  if (textCoordinate) {
    return textCoordinate;
  }

  try {
    const url = new URL(mapUrl);
    const coordinateParams = [
      "ll",
      "sll",
      "near",
      "q",
      "query",
      "destination",
      "daddr"
    ];

    for (const param of coordinateParams) {
      const coordinate = coordinateFromPair(url.searchParams.get(param));

      if (coordinate) {
        return coordinate;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function coordinateFor(place: MapDestination) {
  return place.coordinate ?? coordinateFromMapUrl(place.mapUrl);
}

function coordinateString(coordinate: Coordinate) {
  return `${coordinate.lat},${coordinate.lng}`;
}

function textDestinationFor(place: MapDestination) {
  return [place.name, place.address, place.city].filter(Boolean).join(", ");
}

function appleTextDestinationFor(place: MapDestination) {
  return [place.address, place.city, place.name].filter(Boolean).join(", ");
}

export function locationInputParts(
  value: string,
  currentAddress = "",
  currentMapUrl?: string
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { address: "", mapUrl: undefined };
  }

  const mapUrl = normalizedMapUrl(trimmedValue);

  if (mapUrl) {
    return {
      address: currentAddress.trim(),
      mapUrl
    };
  }

  return {
    address: trimmedValue,
    mapUrl:
      trimmedValue === currentAddress.trim()
        ? normalizedMapUrl(currentMapUrl)
        : undefined
  };
}

export function destinationFor(place: MapDestination) {
  const coordinate = coordinateFor(place);

  if (coordinate) {
    return coordinateString(coordinate);
  }

  return textDestinationFor(place);
}

export function externalMapUrl(place: MapDestination) {
  return normalizedMapUrl(place.mapUrl) ?? googleMapsSearchUrl(place);
}

export function googleMapsSearchUrl(place: MapDestination) {
  const query = encodeURIComponent(destinationFor(place));

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function googleMapsDirectionsUrl(place: MapDestination) {
  const destination = encodeURIComponent(destinationFor(place));

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function appleMapsSearchUrl(place: MapDestination) {
  const coordinate = coordinateFor(place);
  const query = encodeURIComponent(place.name || appleTextDestinationFor(place));

  if (coordinate) {
    return `https://maps.apple.com/?ll=${coordinateString(coordinate)}&q=${query}`;
  }

  if (place.address) {
    return `https://maps.apple.com/?address=${encodeURIComponent(appleTextDestinationFor(place))}`;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(textDestinationFor(place))}`;
}

export function appleMapsDirectionsUrl(place: MapDestination) {
  return appleMapsSearchUrl(place);
}

function appleMapsRouteDestinationFor(place: MapDestination) {
  return destinationFor(place) || appleTextDestinationFor(place);
}

export function appleMapsRouteUrl(places: MapDestination[]) {
  const routePlaces = places.filter(Boolean);

  if (routePlaces.length === 0) {
    return "https://maps.apple.com";
  }

  if (routePlaces.length === 1) {
    return appleMapsSearchUrl(routePlaces[0]);
  }

  const origin = encodeURIComponent(
    appleMapsRouteDestinationFor(routePlaces[0])
  );
  const destination = encodeURIComponent(
    appleMapsRouteDestinationFor(routePlaces[routePlaces.length - 1])
  );

  return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
}

export function googleMapsRouteUrl(places: MapDestination[]) {
  const routePlaces = places.filter(Boolean);

  if (routePlaces.length === 0) {
    return "https://www.google.com/maps";
  }

  if (routePlaces.length === 1) {
    return externalMapUrl(routePlaces[0]);
  }

  const origin = encodeURIComponent(destinationFor(routePlaces[0]));
  const destination = encodeURIComponent(
    destinationFor(routePlaces[routePlaces.length - 1])
  );
  const waypoints = routePlaces
    .slice(1, -1)
    .map((place) => destinationFor(place))
    .join("|");

  const waypointQuery = waypoints
    ? `&waypoints=${encodeURIComponent(waypoints)}`
    : "";

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointQuery}`;
}
