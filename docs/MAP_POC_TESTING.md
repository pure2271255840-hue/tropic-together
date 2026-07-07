# Mainland-China Map Provider POC Testing

This guide is for the isolated internal page:

```text
/internal/map-poc
```

The page is non-production. It does not choose a production map provider and does not modify the existing trip dashboard UI.

## Candidate Providers

- AMap / Gaode: primary mainland-accessible candidate. Test whether Malaysia places and routes work reliably.
- Tencent Maps: second mainland-accessible candidate. Test overseas coverage, mobile interaction, and route behavior.
- Baidu Maps: mainland-accessible comparison provider. Watch for coordinate offset and overseas coverage limitations.
- Configurable raster tiles: provider-neutral tile endpoint experiment for future self-hosted or domestic CDN tiles.
- List/static/external fallbacks: product resilience prototypes when interactive maps are unavailable.

## Required Manual Accounts and Keys

Create only test keys for the POC. Do not commit real values.

```env
NEXT_PUBLIC_MAP_POC_AMAP_KEY=
NEXT_PUBLIC_MAP_POC_AMAP_SECURITY_CODE=
NEXT_PUBLIC_MAP_POC_TENCENT_KEY=
NEXT_PUBLIC_MAP_POC_BAIDU_AK=
NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE=
NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE=
```

Notes:

- Browser map SDK keys are visible to the browser by nature. Restrict them by domain/referrer in each provider console.
- AMap / Gaode JS API 2.0 also requires the web security code to be configured before loading the SDK. Store it as `NEXT_PUBLIC_MAP_POC_AMAP_SECURITY_CODE` for this isolated POC and keep the domain whitelist tight.
- `NEXT_PUBLIC_MAP_POC_RASTER_TILE_TEMPLATE` should use `{z}`, `{x}`, and `{y}` placeholders.
- `NEXT_PUBLIC_MAP_POC_EXTERNAL_NAV_URL_TEMPLATE` may use `{lat}`, `{lng}`, and `{name}` placeholders.
- These keys are for the internal POC only and are not a production map architecture decision.

## Desktop Browser Test

1. Start the local app:

   ```powershell
   npm run dev
   ```

2. Open:

   ```text
   http://localhost:3000/internal/map-poc
   ```

3. Select one provider at a time.
4. Keep network condition as `Overseas` or the real condition you are using.
5. Confirm whether the map initializes and tiles render.
6. Confirm all fixed WGS84 pins appear in plausible locations:
   - George Town
   - Armenian Street
   - Chew Jetty
   - Kek Lok Si Temple
   - ChinaHouse Penang
   - Kota Kinabalu Waterfront
   - Jesselton Point
   - Tanjung Aru Beach
   - Gaya Street
   - Kota Kinabalu International Airport
7. Run place search with at least:
   - `George Town Penang Malaysia`
   - `Jesselton Point Kota Kinabalu Malaysia`
8. Run both route cases:
   - George Town -> Armenian Street -> Chew Jetty
   - Jesselton Point -> Gaya Street -> Tanjung Aru Beach
9. Record visible errors and notes in the results panel.
10. Test all fallback modes:
    - list
    - static
    - external
    - unavailable

## iPhone / Android Mobile Browser Test

1. Deploy the branch to a preview URL or expose local dev through a trusted LAN tunnel.
2. Open `/internal/map-poc` in Safari on iPhone and Chrome on Android.
3. Set the network condition field to the real condition.
4. For each provider:
   - reload the provider;
   - pan and pinch zoom;
   - tap/drag the map;
   - run place search;
   - run route calculation;
   - mark mobile interaction as passed only if touch behavior is usable.
5. Confirm the page is usable on a narrow viewport and the results panel remains readable.

## Mainland-China Mobile Network Without VPN

This is the decisive test.

1. Use a mainland-China mobile network with VPN disabled.
2. Open the deployed POC URL directly in the phone browser.
3. Set network condition to `Mainland China / no VPN`.
4. Test each provider independently.
5. Record:
   - whether the page itself loads;
   - whether provider SDK script loads;
   - whether tiles render;
   - whether WGS84 pins look offset;
   - whether place search returns Malaysia results;
   - whether the two Malaysia route cases work;
   - whether panning and pinch zoom feel usable;
   - whether any provider console/domain-key restrictions appear.
6. Do not recommend a production provider until this test is complete.

## Pass Criteria

A provider is a serious production candidate only if it passes all of these on mainland no-VPN mobile testing:

- SDK and tiles load without VPN.
- Pins render in plausible WGS84 locations for Penang and Kota Kinabalu.
- Place search returns useful Malaysia results.
- Route calculation works for both route cases, or there is a clearly acceptable fallback strategy.
- Touch pan and pinch zoom are usable.
- Errors are understandable and the list/static fallback keeps the trip usable.

## Stop Point

After recording real-device results, stop and compare providers. Do not integrate a production map provider until the product owner approves the recommendation.
