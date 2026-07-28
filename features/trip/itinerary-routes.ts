import {
  externalMapUrl,
  googleMapsRouteUrl,
  type MapDestination
} from "@/features/trip/navigation-links";
import type { ItineraryDay, ItineraryVersion, TravelPlace } from "./types";

export type ItineraryRoutePlan = {
  href: string;
  label: string;
};

export function hotelStopForLocation(
  hotelAddress?: string,
  hotelMapUrl?: string
): MapDestination | null {
  const address = hotelAddress?.trim();
  const mapUrl = hotelMapUrl?.trim();

  return address || mapUrl
    ? {
        name: "酒店",
        address: address || mapUrl || "",
        city: "",
        mapUrl
      }
    : null;
}

export function placesForItineraryDay(
  day: ItineraryDay,
  placeById: Map<string, TravelPlace>
) {
  return day.items
    .map((item) => (item.placeId ? placeById.get(item.placeId) : undefined))
    .filter((place): place is TravelPlace => Boolean(place));
}

export function placesForItineraryVersion(
  version: ItineraryVersion,
  placeById: Map<string, TravelPlace>
) {
  return version.days.flatMap((day) => placesForItineraryDay(day, placeById));
}

export function routePlanForItineraryDay(
  day: ItineraryDay,
  placeById: Map<string, TravelPlace>,
  hotelAddress?: string,
  hotelMapUrl?: string
): ItineraryRoutePlan | null {
  const dayPlaces = placesForItineraryDay(day, placeById);
  const hotelStop = hotelStopForLocation(hotelAddress, hotelMapUrl);

  if (hotelStop && dayPlaces.length > 0) {
    return {
      href: googleMapsRouteUrl([hotelStop, ...dayPlaces]),
      label: "当天路线"
    };
  }

  if (dayPlaces.length > 1) {
    return { href: googleMapsRouteUrl(dayPlaces), label: "当天路线" };
  }

  if (dayPlaces.length === 1) {
    return { href: externalMapUrl(dayPlaces[0]), label: "查看当天地点" };
  }

  return null;
}

export function routePlanForItineraryVersion(
  version: ItineraryVersion,
  placeById: Map<string, TravelPlace>,
  hotelAddress?: string,
  hotelMapUrl?: string
): ItineraryRoutePlan | null {
  const routePlaces = placesForItineraryVersion(version, placeById);
  const hotelStop = hotelStopForLocation(hotelAddress, hotelMapUrl);

  if (hotelStop) {
    const stops = [hotelStop, ...routePlaces];

    return stops.length > 1
      ? { href: googleMapsRouteUrl(stops), label: "总路线" }
      : { href: externalMapUrl(hotelStop), label: "查看酒店" };
  }

  if (routePlaces.length > 1) {
    return { href: googleMapsRouteUrl(routePlaces), label: "总路线" };
  }

  if (routePlaces.length === 1) {
    return { href: externalMapUrl(routePlaces[0]), label: "查看地点" };
  }

  return null;
}
