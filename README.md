# Swipefile 🗂️⚡

**Save it. Swipe it. Actually do it.**

You save tutorial videos, reels, and posts constantly and never come back to
them. Swipefile fixes that: share any link into the app, the AI reads it and
turns it into an actionable to-do list, and your saves surface in a swipe
deck — right means "watched it, keep the to-dos," left means "archive it."
A daily reminder nags you (affectionately) until the backlog hits zero.

Built with React Native + Expo (SDK 51), Expo Router, Zustand, Reanimated 3,
and AsyncStorage. Light mode, Plus Jakarta Sans, bouncy springs everywhere.

## Getting started

```bash
npm install
cp .env.example .env    # then fill in EXPO_PUBLIC_BACKEND_URL
npx expo start
```

Open in Expo Go (iOS/Android) or a dev build. `npm run typecheck` runs the
TypeScript check.

## Backend contract

The app talks to exactly one endpoint:

```
POST {EXPO_PUBLIC_BACKEND_URL}/api/process-link
Content-Type: application/json
{ "url": string }
```

**200:**
```json
{
  "platform": "youtube" | "instagram" | "tiktok" | "unknown",
  "summary": "string",
  "keyTakeaways": ["string"],
  "todos": ["string"],
  "toolsMentioned": [{ "name": "string", "url": "string" }],
  "category": "string",
  "transcriptAvailable": true
}
```

**4xx/5xx:** `{ "error": string }` — a **501** means "platform not supported
yet" and gets a friendly toast instead of a generic error.

The client is in `src/api/processLink.ts`.

## Share sheet / deep links

Configured in `app.json`:

- **Android**: `intentFilters` register the app for `VIEW` (http/https +
  `swipefile://`) and `SEND` (`text/plain`), so it appears in the share sheet.
- **iOS**: `CFBundleURLTypes` registers the `swipefile://` URL scheme.
  `swipefile://save?url=<encoded-url>` drops a link straight into processing.
  (A full iOS share *extension* requires a native extension target — the
  standard Expo approach is the URL scheme plus a shortcut/automation, or a
  config plugin in a dev build.)

Incoming URLs are handled in `app/_layout.tsx` via `Linking.getInitialURL()`
and `expo-linking`'s `useURL()`: the link is extracted
(`src/lib/share.ts`), a "Reading your save..." toast appears, the
process-link call fires, and Home shows a shimmering skeleton card until the
backend answers.

## Notifications

`expo-notifications` schedules one repeating daily local notification at the
user's chosen time (default 6pm) — only when unreviewed saves exist. Copy
rotates daily. Tapping it deep-links to the Swipe Deck. Rescheduled on every
app open and whenever the pending count or settings change
(`src/lib/notifications.ts`).

## Data

Everything is local-first in AsyncStorage via `zustand/persist`
(`src/store/useStore.ts`): saved items (with per-item to-dos), user stats
(streaks, totals), and reminder settings. Already-saved items work fully
offline. In dev builds, Settings has a "Seed demo data" row that inserts one
pending, one watched, and one archived save.

## Project layout

```
app/                 Expo Router screens
  _layout.tsx        fonts, deep-link intake, notifications, toasts
  index.tsx          Home dashboard (+ onboarding gate)
  onboarding.tsx     3-screen intro with a real swipeable practice card
  deck.tsx           the swipe deck
  item/[id].tsx      detail view (player + To-dos / Summary / Tools tabs)
  category/[name].tsx  filtered category list with long-press actions
  settings.tsx       reminders, housekeeping, FAQ, about
src/
  api/               backend client
  components/        cards, confetti, shimmer, toasts, bottom sheet, ...
  lib/               copy/voice, category colors, share parsing, notifications
  store/             Zustand stores + types
  theme.ts           design tokens
```
