import type { TravelPlace } from "./types";

export function destinationFor(place: TravelPlace) {
  if (place.coordinate) {
    return `${place.coordinate.lat},${place.coordinate.lng}`;
  }

  return [place.name, place.address, place.city].filter(Boolean).join(", ");
}

export function googleMapsSearchUrl(place: TravelPlace) {
  const query = encodeURIComponent(destinationFor(place));

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function googleMapsDirectionsUrl(place: TravelPlace) {
  const destination = encodeURIComponent(destinationFor(place));

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function appleMapsSearchUrl(place: TravelPlace) {
  const query = encodeURIComponent(place.name);

  if (place.coordinate) {
    return `https://maps.apple.com/?q=${query}&ll=${place.coordinate.lat},${place.coordinate.lng}`;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(destinationFor(place))}`;
}

export function appleMapsDirectionsUrl(place: TravelPlace) {
  const destination = encodeURIComponent(destinationFor(place));

  return `https://maps.apple.com/?daddr=${destination}`;
}

export function googleMapsRouteUrl(places: TravelPlace[]) {
  const routePlaces = places.filter(Boolean);

  if (routePlaces.length === 0) {
    return "https://www.google.com/maps";
  }

  if (routePlaces.length === 1) {
    return googleMapsDirectionsUrl(routePlaces[0]);
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
