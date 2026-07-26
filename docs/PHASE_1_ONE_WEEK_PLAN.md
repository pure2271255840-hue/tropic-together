# Phase 1 One-Week MVP Plan

Status: active local-first MVP plan.

Workflow source of truth:

```text
docs/PHASE_1_WORKFLOW_SPEC.md
```

Current project snapshot:

```text
docs/PROJECT_SNAPSHOT.md
```

## Product Direction

Phase 1 is list-first, external-navigation-first, and AI-assisted only after the core collaboration loop works.

The first usable version must not depend on embedded map SDKs. Apple Maps and Google Maps are opened through external URLs. If any external navigation link fails, places, votes, comments, and daily itinerary remain usable.

## Day 1 - Local Product Loop

- Remove retired Phase 0.5 map POC code, docs, and bundle artifacts.
- Add Phase 1 trip data model for trips, members, places, votes, comments, and itinerary days.
- Add mock/localStorage adapter so the app works before Supabase is connected.
- Add local places page with add, edit, status, votes, comments, and external navigation links.
- Add local itinerary page with daily items and external navigation links.
- Keep the existing Next.js frontend shell.

## Day 2 - Mobile UX Pass

- Refactor the local data model around plan stages, place tags, place vote reasons, itinerary versions, and itinerary votes.
- Make the home page status-driven with a clear next-action card.
- Tighten mobile layout for place voting, ranked lists, itinerary version voting, and owner actions.
- Run lint, typecheck, build, and manual mobile viewport checks.

## Day 3 - Supabase Local

- Add Supabase CLI project files.
- Create migrations for trips, trip_members, places, place_votes, place_comments, itinerary_days, and itinerary_items.
- Add seed data matching the local adapter.
- Draft anonymous sign-in plus nickname join flow.
- Keep RLS policy work local only.

## Day 4 - Supabase Adapter

- Add Supabase browser/server clients.
- Implement Supabase adapter behind the same trip store contract.
- Add anonymous Auth and trip membership checks.
- Implement RLS policies so only trip members can read/write trip data.
- Verify local Supabase with reset and seed.

## Day 5 - AI Assistant Slice

- Add server-only AI route contract for structured trip data.
- Implement itinerary draft generation from ranked places, dates, hotels, vote scores, and vote reasons.
- Keep provider keys server-side only.
- Make AI output editable before saving.
- Do not let AI confirm the final itinerary.

## Day 6 - Remote Dev Preview

- Create or connect a remote Supabase dev project.
- Push migrations and seed only to the dev project.
- Deploy frontend preview.
- Test invitation link, login, votes, comments, itinerary, and external navigation on real phones.

## Day 7 - Friend-Ready Freeze

- Fix friend testing feedback.
- Add simple data export or backup checklist.
- Freeze risky feature work before travel.
- Keep AI and map behavior non-blocking.
