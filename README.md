# Tropic Together Frontend Prototype

Tropic Together is a private collaborative travel-planning frontend for a Penang and Kota Kinabalu group trip from August 1-10, 2026.

This checkpoint contains only the mobile-first app shell and dashboard prototype. Data is local mock data; no backend, Supabase, authentication, API routes, secrets, or deployment configuration are implemented here.

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
- `/trip/[tripId]` renders the trip dashboard
- `/_not-found` is provided by Next.js

The bottom and side navigation includes placeholders for future map, itinerary, task, and more pages, but those routes are not implemented in this checkpoint.

## Major Frontend Areas

- `app/` - Next.js App Router layout, loading, error, redirect, and trip dashboard route.
- `components/layout/` - shared shell, desktop side navigation, and mobile bottom navigation.
- `components/trip/dashboard/` - dashboard cards for trip header, quick actions, today plan, upcoming task, task overview, recent places, loading state, and mock-data notice.
- `components/ui/` - small local UI primitives used by the dashboard.
- `features/dashboard/` - dashboard types, mock data adapter, and view utilities.
- `lib/utils.ts` - shared class-name merge helper.

## Mock Data

All trip dashboard data currently comes from:

```text
features/dashboard/mock-data.ts
```

The mock data covers:

- Trip summary and destination tags
- Members and avatars
- Countdown source dates
- Today plan
- Upcoming task
- Due-soon tasks
- Unassigned task empty state
- Recently added places

Do not represent this data as database-backed. When backend contracts are available, replace the mock adapter rather than rewriting the UI components.

## Dependencies

Runtime dependencies:

- Next.js
- React
- React DOM
- Lucide React
- clsx
- tailwind-merge

Development dependencies:

- TypeScript
- Tailwind CSS
- PostCSS
- Autoprefixer
- ESLint
- eslint-config-next
- React and Node type packages

`package.json` includes a PostCSS override so nested packages use the patched project PostCSS version.

## Files To Treat Carefully

These files and folders should not be changed casually because they define app-wide behavior, routes, or integration boundaries:

- `app/layout.tsx`
- `app/globals.css`
- `app/trip/[tripId]/page.tsx`
- `components/layout/`
- `features/dashboard/types.ts`
- `features/dashboard/mock-data.ts`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

Do not add or modify these areas without an explicit backend/security task and technical review:

- `supabase/`
- `supabase/migrations/`
- `supabase/functions/`
- `middleware.ts`
- `lib/supabase/`
- `lib/openai/`
- server-only API routes
- authentication logic
- RLS policies
- storage security rules
- deployment configuration
- secret-bearing environment files

## Checkpoint Status

Last verified with:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```
