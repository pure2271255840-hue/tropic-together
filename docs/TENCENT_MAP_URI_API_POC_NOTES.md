# Tencent Map URI API POC Notes

Status: Phase 0.5 POC reference only. This document is for fixing and testing the isolated Tencent Maps POC. Do not use it to start Supabase, Vercel, Auth, database, Nginx, or systemd work.

## Why This Matters

The current Tencent Maps POC has three separate surfaces:

- Embedded JavaScript GL map: loads SDK, renders tiles, displays markers, and may expose service helpers.
- Search/route service calls: return data to the page when supported by the current API, key, quota, and region.
- URI API: opens Tencent Map Web/Wap pages for search, marker, geocoder, or routeplan.

The URI API is useful as a fallback and manual verification path, but it does not return JSON to our app and does not directly draw an embedded route polyline in our POC.

## Relevant Tencent Documents

Read these before changing the POC:

- WebService API / Search service / Place search: JSON POI search, `boundary`, POI fields, and POI detail lookup.
- WebService API / Route service / Direction API: JSON route planning, waypoint format, road adsorption, and compressed route polylines.
- JavaScript API GL: embedded map, markers, labels, and polylines in the browser.
- URI API: external Tencent Map Web/Wap handoff links.

The Data Visualization JS API is not a fix path for the current problems. It adds visualization layers such as dot or heatmap layers on top of JavaScript API GL. It does not solve POI search coverage, missing address fields, or route planning.

## Current Findings To Preserve

- Tencent SDK load: passed in deployed POC.
- Tile rendering: passed in deployed POC.
- Marker display: passed in deployed POC.
- Domestic place search: works for Chinese terms such as `东安`; returned results may omit an `address` field.
- Malaysia place search: `George Town Penang Malaysia` returned no Malaysia results in the current POC.
- Malaysia route planning via embedded route service: returned `status 348: 参数错误，起终点坐标错误`.
- Earlier `center格式错误` was caused by using center-based search parameters in the POC; avoid treating that as provider coverage evidence.
- React `#418` was caused by hydration text mismatch from timestamp rendering and should remain fixed in the POC.

## WebService Search API

The WebService place search endpoint returns JSON:

```text
GET https://apis.map.qq.com/ws/place/v1/search
```

It supports several search shapes:

- Region search: `boundary=region(city_name[,auto_extend][,lat,lng])`
- Nearby search: `boundary=nearby(lat,lng,radius[,auto_extend])`
- Rectangle search: `boundary=rectangle(swLat,swLng,neLat,neLng)`
- Polygon search: `GET /ws/place/v1/search_by_polygon`
- Explore: `GET /ws/place/v1/explore`
- POI detail: `GET /ws/place/v1/detail?id={poiId}`

Important rules from the docs:

- Coordinates use `lat,lng`, latitude first.
- `keyword` searches one term. Long combined queries may behave worse than shorter place names.
- `page_size` max is 20.
- Search results may include `data[]`, `cluster[]`, or both depending on query breadth.
- POI fields include `id`, `title`, `address`, `category`, `type`, `location`, and `ad_info`.
- `type=4` means administrative division. These results can be valid even when they are not street-address POIs.

POC search diagnostics:

```text
boundary=region(Malaysia,1)&keyword=George%20Town
boundary=region(Penang,1)&keyword=George%20Town
boundary=region(Kota%20Kinabalu,1)&keyword=Jesselton%20Point
boundary=nearby(5.4141,100.3288,5000,1)&keyword=George%20Town
boundary=nearby(5.9894,116.0802,5000,1)&keyword=Jesselton%20Point
```

POC implications:

- If WebService search returns domestic data but no Malaysia data, record that as a POI coverage limitation or missing overseas entitlement.
- If WebService search returns Malaysia POIs while JavaScript service search does not, use WebService as stronger provider capability evidence and record JavaScript service parity as a POC limitation.
- If WebService search returns `id`, follow up with `/ws/place/v1/detail` for address and metadata.

Security note:

- WebService uses a `key` parameter. For production, do not call WebService directly from the browser with an unrestricted key.
- For this isolated POC, any browser-exposed key must be a restricted test key only.
- A future production implementation should route WebService calls through our own backend API, but that is outside Phase 0.5 unless separately approved.

## WebService Route API

The driving route endpoint returns JSON:

```text
GET https://apis.map.qq.com/ws/direction/v1/driving/
```

Core driving parameters:

```text
from={lat},{lng}
to={lat},{lng}
waypoints={lat1},{lng1};{lat2},{lng2}
policy=LEAST_TIME
output=json
key={key}
```

Important rules from the docs:

- Coordinates use `lat,lng`, latitude first.
- `from` and `to` are required for driving.
- `waypoints` are semicolon-separated `lat,lng` pairs.
- The service adsorbs origin, destination, and waypoints to nearby roads.
- If no road exists within the documented adsorption range near the origin or destination, route planning fails.
- The route response includes `result.routes[]`, `distance`, `duration`, and compressed `polyline`.

This explains the observed Malaysia error:

```text
status 348: 参数错误，起终点坐标错误
```

For our test coordinates, that can mean one of these:

- The coordinate format is wrong.
- The coordinate system is wrong.
- The chosen point cannot be adsorbed to a supported Tencent road.
- Tencent driving route coverage does not support that Malaysia area for this key/API.

POC route diagnostics:

```text
George Town -> Chew Jetty
from=5.4141,100.3288
to=5.414,100.3419

Armenian Street -> Chew Jet
from=5.4146,100.3379
to=5.414,100.3419

Jesselton Point -> Tanjung Aru Beach
from=5.9894,116.0802
to=5.9483,116.0416

Kota Kinabalu Waterfront -> Kota Kinabalu International Airport
from=5.9804,116.0726
to=5.9372,116.0512
```

If all nearby-road Malaysia route cases return `348`, record route planning as not passing for Malaysia in this POC.

If WebService driving works, decode the compressed route polyline before drawing:

```text
for each i >= 2:
  polyline[i] = polyline[i - 2] + polyline[i] / 1000000
```

Then convert decoded pairs into Tencent map coordinates for `MultiPolyline`.

Security note:

- As with search, production route calls should be server-side behind our own backend API.
- Do not add service secrets or unrestricted keys to browser code.

## URI API Base

Tencent Map URI API opens Tencent Map Web/Wap:

```text
https://apis.map.qq.com/uri/v1/
```

Supported methods from the referenced documentation:

- `search`: place, address, bus line, or nearby search.
- `routeplan`: route planning, including bus and driving; walking is mobile-only.
- `geocoder`: reverse-geocode a coordinate and mark it.
- `marker`: show caller-provided marker details.
- `streetview`: street view.

## Coordinate Rule

For our canonical trip coordinates, use WGS84 in the product/domain model.

When passing WGS84 coordinates to Tencent URI API, include:

```text
coord_type=1
```

The URI API coordinate format is:

```text
lat,lng
```

Latitude comes first, longitude second.

## Referer Rule

URI API requires `referer`.

For the POC, add a browser-safe value such as:

```env
NEXT_PUBLIC_MAP_POC_TENCENT_REFERER=
```

Do not put any service secret, signing secret, service-role key, database password, or private token in `NEXT_PUBLIC_*`.

## Search URI

City or region search:

```text
https://apis.map.qq.com/uri/v1/search?keyword={keyword}&region={region}&coord_type=1&referer={referer}
```

Nearby search:

```text
https://apis.map.qq.com/uri/v1/search?keyword={keyword}&center={lat},{lng}&radius={meters}&coord_type=1&referer={referer}
```

POC usage:

- Use this as an external fallback link, not as an embedded data source.
- Test Malaysia queries manually by opening URI links.
- If Tencent URI search also fails to return Malaysia results, record that as stronger evidence that Tencent is not enough for Malaysia POI coverage.
- If URI search succeeds while JS service search fails, record that the provider may support external map handoff but not the embedded JS service path we tested.

Suggested test URLs to generate, with `referer` redacted in reports:

```text
search?keyword=George%20Town%20Penang%20Malaysia&region=Malaysia&coord_type=1&referer={referer}
search?keyword=Jesselton%20Point%20Kota%20Kinabalu%20Malaysia&region=Malaysia&coord_type=1&referer={referer}
search?keyword=Kek%20Lok%20Si%20Temple%20Penang%20Malaysia&center=5.3988,100.2739&radius=50000&coord_type=1&referer={referer}
```

## Marker URI

Custom marker:

```text
https://apis.map.qq.com/uri/v1/marker?marker=coord:{lat},{lng};title:{title};addr:{addr}&coord_type=1&referer={referer}
```

The URI API marker docs mark `addr` as required. Our internal POC test places do not always have real addresses, so use a safe fallback:

```text
addr={city or "WGS84 test coordinate"}
```

POC usage:

- Add external marker links for each fixed WGS84 test pin.
- This validates coordinate interpretation and mobile Tencent Map handoff.
- It does not validate Tencent POI coverage.

## Geocoder URI

Reverse-address marker:

```text
https://apis.map.qq.com/uri/v1/geocoder?coord={lat},{lng}&coord_type=1&referer={referer}
```

POC usage:

- Useful for checking whether Tencent can resolve a Malaysia WGS84 coordinate to readable location text.
- If geocoder returns no useful Malaysia address, record it separately from POI keyword search.

## Routeplan URI

Driving route:

```text
https://apis.map.qq.com/uri/v1/routeplan?type=drive&from={fromName}&fromcoord={fromLat},{fromLng}&to={toName}&tocoord={toLat},{toLng}&coord_type=1&policy=0&referer={referer}
```

Bus route:

```text
https://apis.map.qq.com/uri/v1/routeplan?type=bus&from={fromName}&fromcoord={fromLat},{fromLng}&to={toName}&tocoord={toLat},{toLng}&coord_type=1&policy=0&referer={referer}
```

Walking:

```text
type=walk
```

Walking is documented as mobile-only.

POC usage:

- Add an external routeplan fallback link for each route case.
- Use only origin and destination for URI routeplan. The pasted URI docs do not define multi-waypoint routeplan parameters.
- Keep embedded route drawing separate from URI routeplan. URI routeplan opens Tencent Map and cannot provide a polyline to our app.

Suggested route URLs to generate:

```text
routeplan?type=drive&from=George%20Town&fromcoord=5.4141,100.3288&to=Chew%20Jetty&tocoord=5.414,100.3419&coord_type=1&policy=0&referer={referer}
routeplan?type=drive&from=Jesselton%20Point&fromcoord=5.9894,116.0802&to=Tanjung%20Aru%20Beach&tocoord=5.9483,116.0416&coord_type=1&policy=0&referer={referer}
```

## UI Changes Recommended For The POC

Add these to the isolated POC only:

- Provider config value: `NEXT_PUBLIC_MAP_POC_TENCENT_REFERER`.
- Optional provider config value for restricted POC-only WebService testing: `NEXT_PUBLIC_MAP_POC_TENCENT_WEBSERVICE_KEY`.
- External Tencent URI links for each fixed place:
  - marker link
  - geocoder link
  - search link
- External Tencent URI link for each route case:
  - driving routeplan from origin to destination
- Optional WebService diagnostics:
  - place search with `boundary=region`
  - place search with `boundary=nearby`
  - route planning via `/ws/direction/v1/driving/`
  - POI detail lookup when search returns POI IDs
- Result notes explaining whether each URI handoff:
  - opens in mainland China without VPN
  - shows Malaysia search results
  - shows Malaysia marker/geocoder details
  - shows Malaysia driving route

Do not replace the embedded map test with URI links. The embedded map still needs separate SDK/tile/marker/search/route verification.

## Address Display Fix

`No address returned` means the returned result object had no `address` field. It is not necessarily an error.

Improve display by using fallback fields:

```text
address || addr || formatted ad_info province/city/district || "No address returned"
```

This helps domestic administrative results such as `东安区` show useful context even when no street address is returned.

## Decision Rules

Use these rules in the Phase 0.5 report:

- If SDK, tiles, and markers work: Tencent passes basic overseas map display.
- If embedded search returns no Malaysia results and WebService/URI search also fails: Tencent does not currently meet Malaysia POI search needs.
- If embedded route returns `348` and WebService/URI routeplan also fails for Malaysia coordinates: Tencent does not currently meet Malaysia route planning needs.
- If WebService search succeeds but JavaScript service search fails: use WebService result as provider capability evidence, but record that embedded JS service integration needs a different implementation.
- If WebService route succeeds but JavaScript service route fails: draw decoded WebService polyline in the embedded map, but only with a restricted POC key or a future backend proxy.
- If URI routeplan works but embedded route service fails: Tencent may be acceptable only as an external-navigation fallback, not as an embedded route provider.
- If URI marker/geocoder works for Malaysia coordinates: Tencent can still be useful for coordinate display and handoff even if POI/route coverage is weak.

## Safety Boundaries

- Do not expose API keys, service secrets, or full URLs containing sensitive parameters in reports.
- Do not add Tencent service secrets to browser code.
- Do not modify Supabase, Auth, database, Nginx, systemd, or production deployment configuration for this POC.
- Do not merge PRs as part of this Phase 0.5 validation.
