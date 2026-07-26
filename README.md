# Tropic Together

Tropic Together is a private collaborative travel-planning web app for a Penang and Kota Kinabalu group trip from August 1-10, 2026.

The current checkpoint is Phase 1 MVP work. The app uses Next.js, React, TypeScript, Tailwind CSS, and a trip storage adapter that writes to Supabase when configured, with localStorage as the fallback. There is no embedded map SDK. Apple Maps and Google Maps are opened through external URLs.

Primary Phase 1 workflow document:

```text
docs/PHASE_1_WORKFLOW_SPEC.md
```

Current project snapshot:

```text
docs/PROJECT_SNAPSHOT.md
```

## Local Setup

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/trip/penang-kota-kinabalu-2026
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd`:

```bash
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## Current Routes

- `/` redirects to `/trip/penang-kota-kinabalu-2026`
- `/trip/[tripId]` renders the local-first trip home
- `/trip/[tripId]/places` renders places, add/edit, votes, comments, status, and external navigation links
- `/trip/[tripId]/itinerary` renders daily itinerary items and external navigation links

The current local UI is a technical base, not the final Phase 1 interaction model. Next work should refactor it around plan stages, place tags, place vote reasons, itinerary versions, and whole-itinerary voting.

## Major Frontend Areas

- `app/` - Next.js App Router routes, layout, loading, and error states.
- `components/layout/` - shared shell, desktop side navigation, and mobile bottom navigation.
- `components/trip/home/` - Phase 1 trip home page.
- `components/trip/places/` - places list, add/edit form, votes, comments, and navigation links.
- `components/trip/itinerary/` - daily itinerary page.
- `components/trip/phase1/` - shared Phase 1 UI such as member switching.
- `components/ui/` - local UI primitives.
- `features/trip/` - Phase 1 trip types, seed data, localStorage adapter, hook, labels, and external navigation URL helpers.
- `lib/utils.ts` - shared class-name merge helper.

## Local Data

Without Supabase environment variables, Phase 1 data is stored in browser localStorage under a `tropic-together:phase1:*` key.

With Supabase configured, the app stores one row per trip in `public.trip_phase1_workspaces`, using `jsonb` for the current Phase 1 data shape. This keeps the frontend CRUD stable while Auth, membership, and a normalized schema are still being designed.

Supabase mode does not automatically recreate seed data after everything is deleted. To start an online test with realistic data, open the itinerary page and click `导入测试行程`. That imported trip is real Supabase data and can be edited or deleted.

## Supabase Setup

Apply the migration:

```text
supabase/migrations/20260726000000_trip_phase1_workspaces.sql
```

Then set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The current migration uses temporary permissive RLS policies for the prototype because the app does not have real authentication yet. Tighten these policies before production.

## Next Backend Steps

The intended backend path is:

1. Supabase JSON workspace storage for Phase 1.
2. Anonymous Auth plus nickname join flow.
3. RLS policies so only trip members can access trip data.
4. Normalized tables for trips, places, votes, days, and activities.
5. Remote Supabase dev project.
6. Frontend preview deployment.

Supabase will manage database, Auth, Storage, and optional Edge Functions. Next.js frontend hosting remains separate.

## Out Of Scope For This Checkpoint

- Embedded map SDKs
- Google Maps API keys or Apple MapKit JS
- Production Supabase project changes
- Auth and RLS implementation
- AI provider integration
- File uploads, expenses, reminders, and push notifications

## Files To Treat Carefully

- `app/layout.tsx`
- `app/globals.css`
- `app/trip/[tripId]/page.tsx`
- `components/layout/`
- `features/trip/types.ts`
- `features/trip/local-storage-adapter.ts`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

Do not commit real secrets. Do not put service-role keys, database passwords, AI provider keys, or booking references in `NEXT_PUBLIC_*`.
