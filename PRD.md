# PRD — Swipefile

Product requirements for Swipefile, reconstructed from the current codebase (README, screens,
store, backend, and in-app copy). This is a living doc of what's built, not a forward-looking
spec — update it as the product changes.

## 1. Problem

People save tutorial videos, reels, and posts constantly (YouTube, Instagram, TikTok) and almost
never come back to them. The "saved" folder becomes a graveyard: hundreds of items, no plan for
any of them, no feedback loop. The friction isn't storage — it's not knowing *what to do* with
each save, and never having a moment that forces a decision on it.

## 2. Product concept

**Save it. Swipe it. Actually do it.**

Swipefile turns saved links into a personal accountability loop:
1. Share a link into the app (or paste a batch of them).
2. AI reads the content and converts it into a summary, key takeaways, and a concrete to-do list.
3. The save surfaces as a card in a swipe deck. **Swipe right** = "I watched it, keep the to-dos."
   **Swipe left** = "archive it, I'm letting this one go." Both are treated as a win — the app's
   whole thesis is that *deciding* is the productive act, not necessarily finishing the video.
4. A single daily reminder (not a guilt spiral) nudges the user back in only when saves are
   actually waiting.

## 3. Target user & tone

Someone who saves tutorials/reels at 1am and feels vaguely bad about it by 1pm. The product's
voice (`src/lib/copy.ts`) is self-aware and lightly sarcastic about this exact behavior, never
mean — e.g. "Good morning. Your backlog is judging you." / "Backlog zero. You actually did it. We're
proud of you. Genuinely surprised, but proud." Every user-facing string lives in one copy file to
keep the voice consistent.

## 4. Core features

### 4.1 Save intake
- **Share sheet / deep link**: Android `SEND` intent filter (text/plain) and both platforms'
  `swipefile://` URL scheme register the app in the OS share sheet. Sharing a link triggers
  `swipefile://save?url=<encoded-url>`, extracted by `src/lib/share.ts` and handled centrally in
  `app/_layout.tsx` (cold start via `Linking.getInitialURL()`, warm via `expo-linking`'s
  `useURL()`), with a "Reading your save..." toast shown immediately.
- **Bulk import ("Saves rescue mission", `app/import.tsx`)**: a paste box where a user dumps every
  link copied out of their platform-native "saved" folder at once. The app extracts all URLs from
  the pasted text and processes up to 3 concurrently, showing live progress (`done`/`failed`/`total`)
  and a completion summary. This is explicitly the productized version of the "paste your saves
  into ChatGPT" workflow people do manually.
- A pasted/shared URL that already exists and previously failed is retried in place rather than
  duplicated; one that already succeeded is returned as-is (no duplicate cards).

### 4.2 AI processing
- Every saved URL is POSTed to a single backend endpoint (contract below). The backend detects
  platform (YouTube / Instagram / TikTok / other via regex), fetches whatever content it can
  (YouTube: oEmbed title + best-effort caption scrape; other links: Open Graph title/description),
  and sends that content to Claude with a prompt demanding a specific JSON shape.
- Output fields: `summary` (2–3 sentences), `keyTakeaways` (3–5 bullets), `todos` (3–5 actionable
  tasks), `toolsMentioned` (name + URL pairs for any tool/app referenced), `category` (one of a
  fixed set: Design, Marketing, Dev, Business, Health, Finance, Productivity, Other),
  `transcriptAvailable` (whether a real transcript was used vs. title-only).
- A platform the backend doesn't support returns **501**, surfaced in-app as a friendly
  "not supported yet" state rather than a generic error — YouTube is called out as the platform
  that "works great."
- While processing, the item shows as a shimmering skeleton card on the dashboard and a full
  loading state on its detail page; processing is fully async and doesn't block navigation.

### 4.3 The swipe deck (`app/deck.tsx`)
- Shows one card at a time (with the next two peeking behind, scaling in as the top card is
  dragged) for every `ready`, unreviewed item.
- Drag right past a threshold (~30% of screen width) → **keep**: success haptic, a confirmation
  sheet lists the item's to-dos ("Kept. Here's your homework."), stats increment (`totalKept`,
  streak).
- Drag left past threshold → **archive**: warning haptic, toast, stats increment (`totalArchived`).
- Tapping a card (not dragging) opens its detail page instead.
- Clearing the whole deck in one sitting triggers a confetti celebration screen with a native
  share action ("Backlog zero on Swipefile...").
- An empty deck with nothing ever swiped this session shows a plain empty state instead.

### 4.4 Item detail (`app/item/[id].tsx`)
- Embeds the original content: YouTube gets a proper embed URL (parsed out of watch/shorts/youtu.be
  links), everything else loads in a WebView pointed at the original URL, with a gradient
  play-button fallback on web or on WebView failure.
- Three tabs: **To-dos** (checkable list with a progress bar and a "show-off" label at 100%),
  **Summary** (AI summary + key takeaways), **Tools** (chips for each mentioned tool, tapping one
  opens a Google search for it).
- "Mark as watched" promotes the item to `kept` from the detail view directly (an alternate path
  to swiping right in the deck).
- Failed/unsupported items get a dedicated error state with a retry (failed) or "open original"
  (unsupported) action.

### 4.5 Home dashboard (`app/index.tsx`)
- Time-of-day-aware greeting that reacts to pending count ("Evening — 3 saves want attention.").
- Current streak shown as a pill when > 0.
- Horizontal "Waiting on you" rail: processing skeletons, ready-but-unreviewed cards, and
  failed/unsupported "problem cards" (each with inline Retry/Remove actions) all in one row.
- "Your piles": category tiles (gradient-colored per category, count per tile) linking to a
  filtered list view.
- "Receipts": three stat tiles — saved this week, to-dos completed, current streak.
- Empty state (no saves at all) explains the share-sheet flow and offers the bulk-import screen
  as an alternate entry point.

### 4.6 Category view (`app/category/[name].tsx`)
- Lists all `ready` items in one category, filterable by review status (All / Pending / Watched /
  Archived).
- Long-press an item for an action sheet: move to a different category, re-run AI processing, or
  delete (delete is permanent — no undo, no archive).

### 4.7 Onboarding (`app/onboarding.tsx`)
- Three-screen swipeable intro, shown once (gated by `hasOnboarded` in the store):
  1. "Your saves are a graveyard" — an illustrated phone with a cobwebbed saved folder.
  2. "Drop a link. Get a to-do list." — an animated loop of a shared link turning into a card with
     checkable to-dos.
  3. "Swipe your way out of the backlog" — a **real, swipeable practice card** with the same
     gesture physics as the actual deck, so the core mechanic is taught by doing it once.
- Completing onboarding also triggers the notification-permission request.

### 4.8 Daily reminder (`src/lib/notifications.ts`)
- One repeating local notification per day, only scheduled while the queue is non-empty; canceled
  automatically once it's empty. Rescheduled on every app open and whenever the pending count or
  reminder settings change.
- Default time 6pm; user can pick from a fixed set of hours in Settings (8am–9pm) or preview the
  exact copy with a test notification.
- Copy rotates daily across a small set of variants ("Your backlog called. It misses you."), deep
  links to the swipe deck on tap.

### 4.9 Settings (`app/settings.tsx`)
- Reminder toggle + time picker + "preview the nudge" test send; surfaces a direct link to system
  notification settings if permission was denied.
- Housekeeping: clear all archived items (with a confirmation sheet, irreversible); a dev-only
  "seed demo data" action that inserts one pending, one watched, one archived sample item for
  screenshotting/testing.
- An in-app FAQ (how sharing works, why swiping, why the daily nudge) and an About section with
  app version.

### 4.10 Stats & gamification
Tracked in `UserStats`: total saved, total kept, total archived, total to-dos completed, current
streak, last-active date. Streak logic: continues if the last active day was yesterday, resets to
1 otherwise, only advances on a swipe decision (not on saving). Surfaced via the home dashboard
pill/stat tiles and the deck's confetti celebration.

## 5. Backend contract

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
**4xx/5xx:** `{ "error": string }` — **501** specifically means "platform not supported yet" and
is handled distinctly client-side (friendly toast, not a generic failure).

Production implementation: `backend/api/process-link.js`, a Vercel serverless function
(`maxDuration: 30s`) calling the Claude API (`claude-haiku-4-5-20251001`). `mock-backend.js` is a
local stand-in with canned/randomized responses for developing the app without live AI calls.

## 6. Data & privacy model

Everything is **local-first**: saved items (with their to-dos), stats, and settings live entirely
in `AsyncStorage` on-device via `zustand/persist`. There is no server-side account or database —
the backend is a stateless processor called once per link and forgotten. Once processed, an item
works fully offline. This means saves do not sync across devices and are lost if the app's storage
is cleared, which is an accepted tradeoff of the current architecture, not yet a stated
requirement to change.

## 7. Explicitly out of scope / not yet implemented

- No user accounts, sign-in, or cross-device sync.
- No true native iOS share extension (the README notes this needs a config plugin / dev build;
  the shipped approach is the `swipefile://` URL scheme plus a Shortcuts automation).
- No support for platforms beyond YouTube/Instagram/TikTok/generic-page scraping — anything else
  the backend can't classify still gets attempted as a generic page scrape, not rejected outright.
- No automated test suite (see `CLAUDE.md`) — correctness is currently verified via `npm run
  typecheck` and manual testing.

## 8. Success signals (as designed into the product)

The product's own instrumentation implies what it considers success: shrinking the pending queue
("backlog zero"), sustained daily swiping (streaks), and to-dos actually getting checked off after
a "keep" decision — not just more items saved. Saving is explicitly not the celebrated action;
deciding and following through are.
