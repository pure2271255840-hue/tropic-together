import type { RouteRequest, TestPlace } from "./types";

export const mapPocTestPlaces: TestPlace[] = [
  {
    id: "george-town",
    city: "penang",
    name: "George Town",
    coordinate: { lat: 5.4141, lng: 100.3288, system: "wgs84" },
    searchQuery: "George Town Penang Malaysia"
  },
  {
    id: "armenian-street",
    city: "penang",
    name: "Armenian Street",
    coordinate: { lat: 5.4146, lng: 100.3379, system: "wgs84" },
    searchQuery: "Armenian Street Penang Malaysia"
  },
  {
    id: "chew-jetty",
    city: "penang",
    name: "Chew Jetty",
    coordinate: { lat: 5.414, lng: 100.3419, system: "wgs84" },
    searchQuery: "Chew Jetty Penang Malaysia"
  },
  {
    id: "kek-lok-si",
    city: "penang",
    name: "Kek Lok Si Temple",
    coordinate: { lat: 5.3988, lng: 100.2739, system: "wgs84" },
    searchQuery: "Kek Lok Si Temple Penang Malaysia"
  },
  {
    id: "chinahouse-penang",
    city: "penang",
    name: "ChinaHouse Penang",
    coordinate: { lat: 5.4149, lng: 100.3389, system: "wgs84" },
    searchQuery: "ChinaHouse Penang Malaysia"
  },
  {
    id: "kk-waterfront",
    city: "kota-kinabalu",
    name: "Kota Kinabalu Waterfront",
    coordinate: { lat: 5.9804, lng: 116.0726, system: "wgs84" },
    searchQuery: "Kota Kinabalu Waterfront Malaysia"
  },
  {
    id: "jesselton-point",
    city: "kota-kinabalu",
    name: "Jesselton Point",
    coordinate: { lat: 5.9894, lng: 116.0802, system: "wgs84" },
    searchQuery: "Jesselton Point Kota Kinabalu Malaysia"
  },
  {
    id: "tanjung-aru-beach",
    city: "kota-kinabalu",
    name: "Tanjung Aru Beach",
    coordinate: { lat: 5.9483, lng: 116.0416, system: "wgs84" },
    searchQuery: "Tanjung Aru Beach Kota Kinabalu Malaysia"
  },
  {
    id: "gaya-street",
    city: "kota-kinabalu",
    name: "Gaya Street",
    coordinate: { lat: 5.9832, lng: 116.0765, system: "wgs84" },
    searchQuery: "Gaya Street Kota Kinabalu Malaysia"
  },
  {
    id: "kkia",
    city: "kota-kinabalu",
    name: "Kota Kinabalu International Airport",
    coordinate: { lat: 5.9372, lng: 116.0512, system: "wgs84" },
    searchQuery: "Kota Kinabalu International Airport Malaysia"
  }
];

function place(id: string): TestPlace {
  const result = mapPocTestPlaces.find((item) => item.id === id);

  if (!result) {
    throw new Error(`Missing map POC place: ${id}`);
  }

  return result;
}

export const mapPocRouteRequests: RouteRequest[] = [
  {
    id: "penang-heritage-walk",
    label: "George Town -> Armenian Street -> Chew Jetty",
    mode: "driving",
    origin: place("george-town"),
    waypoints: [place("armenian-street")],
    destination: place("chew-jetty")
  },
  {
    id: "kk-coastal-route",
    label: "Jesselton Point -> Gaya Street -> Tanjung Aru Beach",
    mode: "driving",
    origin: place("jesselton-point"),
    waypoints: [place("gaya-street")],
    destination: place("tanjung-aru-beach")
  }
];
