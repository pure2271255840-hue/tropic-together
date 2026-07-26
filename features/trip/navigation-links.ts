import type { TravelPlace } from "./types";

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
  if (place.coordinate) {
    return `${place.coordinate.lat},${place.coordinate.lng}`;
  }

  return [place.name, place.address, place.city].filter(Boolean).join(", ");
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
  const query = encodeURIComponent(place.name);

  if (place.coordinate) {
    return `https://maps.apple.com/?q=${query}&ll=${place.coordinate.lat},${place.coordinate.lng}`;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(destinationFor(place))}`;
}

export function appleMapsDirectionsUrl(place: MapDestination) {
  const destination = encodeURIComponent(destinationFor(place));

  return `https://maps.apple.com/?daddr=${destination}`;
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
