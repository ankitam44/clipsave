# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Swipefile: a React Native + Expo app. Users share a link (YouTube/Instagram/TikTok/any page) into
the app; a backend fetches the content and asks Claude to turn it into a summary, key takeaways,
and to-dos; saved items surface in a swipe deck (right = keep, left = archive).

## Commands

```bash
npm install
cp .env.example .env          # set EXPO_PUBLIC_BACKEND_URL
npx expo start                # dev server (press i/a/w for iOS/Android/web)
npm run typecheck             # tsc --noEmit — the only checked/lint command in this repo
node mock-backend.js          # local mock of /api/process-link, listens on :3001
```

There is no test suite and no lint script configured — `typecheck` is the only automated check.
Always run `npm run typecheck` after TS/TSX changes.

The `backend/` directory is a separate Vercel deployment (its own `package.json`, not part of the
npm workspace above). It needs `ANTHROPIC_API_KEY` set in its environment.

## Architecture

**Two independent deployables in one repo:**
- The Expo app (`app/`, `src/`) — everything the user runs.
- `backend/api/process-link.js` — a single Vercel serverless function that is the app's *only*
  network dependency (see "Backend contract" below). `mock-backend.js` is a drop-in local
  replacement with canned responses, for developing the app without hitting the real API/Claude.

**Backend contract** (`src/api/processLink.ts` is the sole client):
```
POST {EXPO_PUBLIC_BACKEND_URL}/api/process-link   { url }
200 → { platform, summary, keyTakeaways, todos, toolsMentioned, category, transcriptAvailable }
4xx/5xx → { error }   (501 specifically means "platform not supported" → ProcessLinkError.unsupported)
```
The real backend (`backend/api/process-link.js`) detects platform via regex, fetches page content
(YouTube: oEmbed title + best-effort caption scrape; others: og:title/og:description scrape), then
sends that content to Claude (`claude-haiku-4-5-20251001`) with a prompt that demands a specific
JSON shape back. Keep the client-side `ProcessLinkResponse` type (`src/store/types.ts`) and the
prompt's requested JSON shape in sync if either changes.

**State is local-first and centralized in one Zustand store** (`src/store/useStore.ts`), persisted
whole to AsyncStorage via `zustand/persist` (key `swipefile-store`). There is no server-side
storage of saved items — once `processLink` resolves, everything lives on-device. Screens read
state through selectors defined at the bottom of `useStore.ts` (`selectPendingReady`,
`selectQueue`, `selectProcessing`, `selectCategories`, `selectSavedThisWeek`) rather than filtering
`items` inline — add new selectors there instead of duplicating filter logic in components.

Adding/reprocessing an item is async end-to-end: `addItemFromUrl`/`reprocessItem` insert or mark an
item `processing` immediately (so the UI shows a skeleton card), then await `runProcessing`, which
calls the backend and patches the item to `ready`/`failed`/`unsupported`. Retrying a previously
failed URL reuses the existing item id instead of creating a duplicate (see the `existing` check in
`addItemFromUrl`).

**Deep link / share intake** is centralized in `app/_layout.tsx`: `Linking.getInitialURL()` (cold
start) and `expo-linking`'s `useURL()` (warm) both funnel through one `handleIncoming` callback,
which dedupes by URL (`handledUrls` ref), parses the payload via `extractSharedUrl`
(`src/lib/share.ts` — handles both raw URLs and the `swipefile://save?url=` scheme), and drives
toast state (`src/store/useToast.ts` + `ToastHost`) through the save/success/failure states.

**Notifications** (`src/lib/notifications.ts`) reschedule a single repeating daily local
notification on every app open and whenever the pending-queue count or reminder settings change
(effects in `app/_layout.tsx`); it's skipped entirely when the queue is empty. Tapping it deep-links
to `/deck` via notification response data (`{ screen: 'deck' }`), handled in the same root layout.

**Routing**: Expo Router, file-based under `app/`. `app/_layout.tsx` is the root Stack and owns
fonts, splash-screen timing (gated on fonts + store hydration), deep-link intake, and notification
scheduling — most cross-cutting app behavior lives there rather than in individual screens.

**Path alias**: `@/*` → `src/*` (configured in both `tsconfig.json` and `babel.config.js` — keep in
sync if it changes).

**Platform detection** exists in three independent places that must stay conceptually aligned:
`src/lib/platform.ts` (`guessPlatform`, client-side optimistic badge), the backend's own regex
detection (`backend/api/process-link.js`), and `mock-backend.js`'s simplified version.
