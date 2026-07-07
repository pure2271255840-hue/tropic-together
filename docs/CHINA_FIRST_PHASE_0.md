# China-First Phase 0

Status: documentation-only planning checkpoint. Do not create migrations, Auth logic, deployment configuration, provider integrations, or frontend UI changes from this document alone.

## Goal

Make the next implementation phase safe for mainland China accessibility before connecting real providers. The app should be designed so users in mainland China can use the production product without a VPN.

## Phase 0 Documentation Scope

Allowed in this documentation checkpoint:

- Record China-first architecture decisions.
- Define provider-agnostic backend contracts.
- Define AIProvider and MapProvider boundaries.
- Identify provider-specific details that must remain isolated.
- List open product-owner decisions.

Not allowed yet:

- Supabase migrations or RLS changes.
- Auth implementation.
- Alibaba Cloud, Vercel, or Nginx deployment configuration.
- AI provider SDKs, API calls, or provider keys.
- Map provider SDKs, tiles, geocoding, or route integrations.
- Frontend UI changes.

## Mainland-Ready Production Shape

- Next.js runs on Alibaba Cloud ECS or container infrastructure.
- Nginx terminates HTTPS and reverse-proxies to the Next.js server.
- Static assets and uploaded files use Alibaba Cloud OSS, with private buckets for user content.
- Database uses a domestic PostgreSQL-compatible service such as Alibaba Cloud RDS PostgreSQL or PolarDB PostgreSQL.
- AI calls go through a server-side AIProvider abstraction. China production defaults to a mainland-accessible provider candidate such as Qwen/DashScope.
- Map calls go through a MapProvider abstraction. Domestic providers remain replaceable.
- Browser and future Expo clients call only Tropic Together backend APIs.

## AI Provider Architecture

- Provider selection is server-side only.
- The browser must never receive AI provider API keys.
- The browser must call typed Tropic Together API endpoints only.
- Do not determine OpenAI eligibility from VPN availability, client IP, or a user toggle.
- Mainland China production must default to a mainland-accessible provider.
- OpenAI may be enabled only in a separately configured global environment where access and account usage are compliant.
- OpenAI must not be the default or required provider for China production.
- User-facing UI should expose planning modes and quality tiers, not raw provider/model names by default.
- Internal admin and evaluation tooling may show raw provider/model names.
- AI itinerary planning must send only minimized structured trip data.
- Original flight tickets, hotel PDFs, booking references, passport data, full email addresses, raw uploaded documents, and unnecessary private notes must not be sent to AI providers.
- Future Expo/mobile clients use the same backend AI API and never call an AI provider directly.

## Product-Level Planning Modes

Initial product-level modes:

- 国内稳定版
- 快速生成
- 深度规划
- 高质量规划, only where globally supported

These map to server-side model profiles through the ModelRegistry. The mapping can differ by environment without changing frontend API contracts.

## Map Provider Boundary

Domain data should store platform-independent geography:

- stable place IDs
- WGS84 latitude/longitude as the canonical coordinate format
- GeoJSON-compatible geometry where needed
- route legs, distances, durations, and transport mode as normalized data

Provider adapters handle:

- map SDK selection
- tile/style endpoints
- geocoding API shapes
- route API shapes
- coordinate conversion such as GCJ-02 or BD-09 when required
- attribution and quota behavior

## Provider-Specific Isolation

Keep these details out of product/domain logic:

- AI provider SDK imports, base URLs, model names, API keys, request headers, retries, rate limits, token accounting, and billing metadata.
- Map provider tokens, SDKs, tile URLs, coordinate conversion internals, geocoding/routing response shapes, and attribution strings.
- Storage bucket names, object signing credentials, CDN URLs, and signed URL implementation.
- Database connection strings, migration runners, deployment secrets, and environment-specific Auth settings.

## Recommended First Implementation After Documentation Approval

1. Add provider-agnostic domain types and backend contract types only.
2. Add mock/in-memory implementations for AIProvider, MapProvider, TripRepository, and StorageProvider where needed for local development.
3. Keep the existing frontend UI and mock dashboard data.
4. Add tests for contract validation and data minimization rules.
5. Only after product-owner approval, choose the first real Auth/database/deployment path.

## Open Decisions

- Primary mainland deployment region and whether ICP filing is required before public testing.
- First domestic AI provider candidate and fallback order.
- Whether the global environment should be maintained separately from China production.
- MVP Auth method: email magic link, SMS, WeChat, or hybrid.
- Database authorization model: Postgres RLS-style enforcement, application-level authorization, or both.
- First map provider for China users and best provider for Malaysia itinerary coverage.
- Whether internal AI evaluation tooling is required before any user-facing AI planning feature.
