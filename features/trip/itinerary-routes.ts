import {
  defaultPlaceMapUrl,
  defaultRouteMapUrl,
  type MapProviderContext,
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
  hotelMapUrl?: string,
  context?: MapProviderContext
): ItineraryRoutePlan | null {
  const dayPlaces = placesForItineraryDay(day, placeById);
  const hotelStop = hotelStopForLocation(hotelAddress, hotelMapUrl);

  if (hotelStop && dayPlaces.length > 0) {
    const stops = [hotelStop, ...dayPlaces];

    return {
      href: defaultRouteMapUrl(stops, context),
      label: "当天路线"
    };
  }

  if (dayPlaces.length > 1) {
    return {
      href: defaultRouteMapUrl(dayPlaces, context),
      label: "当天路线"
    };
  }

  if (dayPlaces.length === 1) {
    return {
      href: defaultPlaceMapUrl(dayPlaces[0], context),
      label: "查看当天地点"
    };
  }

  return null;
}

export function routePlanForItineraryVersion(
  version: ItineraryVersion,
  placeById: Map<string, TravelPlace>,
  hotelAddress?: string,
  hotelMapUrl?: string,
  context?: MapProviderContext
): ItineraryRoutePlan | null {
  const routePlaces = placesForItineraryVersion(version, placeById);
  const hotelStop = hotelStopForLocation(hotelAddress, hotelMapUrl);

  if (hotelStop) {
    const stops = [hotelStop, ...routePlaces];

    return stops.length > 1
      ? {
          href: defaultRouteMapUrl(stops, context),
          label: "总路线"
        }
      : {
          href: defaultPlaceMapUrl(hotelStop, context),
          label: "查看酒店"
        };
  }

  if (routePlaces.length > 1) {
    return {
      href: defaultRouteMapUrl(routePlaces, context),
      label: "总路线"
    };
  }

  if (routePlaces.length === 1) {
    return {
      href: defaultPlaceMapUrl(routePlaces[0], context),
      label: "查看地点"
    };
  }

  return null;
}
