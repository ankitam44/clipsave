# Swipefile — Product Requirements Document

## Overview

**Tagline:** Save it. Swipe it. Actually do it.

People save tutorial videos, reels, and posts constantly and never come back to them. Swipefile fixes that: share any link into the app, the AI reads it and turns it into an actionable to-do list, and your saves surface in a swipe deck. Right = "watched it, keep the to-dos." Left = archive it. A daily reminder nags you affectionately until the backlog hits zero.

---

## Problem

The "saves graveyard" is a universal behaviour — people bookmark/save content across YouTube, Instagram, and TikTok at a high rate, then rarely return to it. Existing solutions (read-later apps, bookmarks) surface the same content passively and generate guilt, not action.

The viral opportunity: a Notion template teaching people to manually paste their saves folder into ChatGPT with a prompt to extract to-dos went widely shared. The workflow works but requires effort. Swipefile productises it end-to-end.

---

## Target User

Mobile-first content consumers (18–35) who:
- Actively save YouTube tutorials, Instagram reels, TikTok educational content
- Have a "saves graveyard" of hundreds of unreviewed items
- Respond to streaks, progress indicators, and light gamification
- Want to feel productive without friction

---

## Core Features

### 1. Share-sheet link intake
- User shares any YouTube / Instagram / TikTok URL from the native OS share sheet into the app
- Android: `intentFilters` for `VIEW` (http/https + `swipefile://`) and `SEND` (`text/plain`)
- iOS: `CFBundleURLTypes` registers the `swipefile://` URL scheme; `swipefile://save?url=<encoded>` drops a link straight into processing
- A "Reading your save…" toast appears immediately; skeleton card shimmers until the backend responds

### 2. AI processing
- Backend receives the URL, fetches content (YouTube transcript via captions API if available, OG meta tags for Instagram/TikTok)
- Claude AI (claude-haiku-4-5-20251001) generates:
  - `summary` — 2–3 sentences
  - `keyTakeaways` — 3–5 bullet strings
  - `todos` — 3–5 actionable plain strings
  - `toolsMentioned` — `{name, url}` objects for any tools/apps referenced
  - `category` — Design | Marketing | Dev | Business | Health | Finance | Productivity | Other
  - `platform` — youtube | instagram | tiktok | unknown
  - `transcriptAvailable` — boolean

### 3. Swipe deck
- Cards presented one at a time in a physics-driven swipe deck (Reanimated 4)
- Swipe right → keep; to-dos stay in queue
- Swipe left → archive
- ±15° rotation, proportional green/coral overlays, 30% threshold spring-back
- Stack parallax effect (0.9→1.0 scale)
- Confetti rain when backlog hits zero

### 4. Card detail view
- WebView player (YouTube embed) or gradient fallback for unsupported embeds
- Three tabs: To-dos | Summary | Tools
- Animated progress bar showing completed / total to-dos
- Checkbox confetti micro-burst on completion
- "Mark as watched" button → archives the card, unlocks to-dos

### 5. Home dashboard
- Greeting copy that rotates based on time of day and pending count
- "Waiting on you" horizontal scroll of pending cards + processing skeletons + error cards
- "Your piles" category tiles with gradient backgrounds
- Receipts: saved this week / to-dos done / swipe streak stats
- Empty state with bouncing arrow and rescue CTA

### 6. Saves Rescue (bulk import)
Productises the viral "paste your saves folder into ChatGPT" workflow.

- Entry: 🛟 button in home header + "Or paste your whole saves folder" CTA on empty state
- User pastes any blob of text (export from saves folder, links copied from browser, etc.)
- `extractAllUrls()` parses every `http(s)://` URL, strips trailing punctuation, deduplicates, skips dev/runtime hosts
- Live count pill: "N links found"
- Three processing phases: paste → working (progress bar, 3 concurrent workers) → done
- Done state: count of rescued vs failed, routes to deck or home

### 7. Category view
- Filtered list of items per category
- Status filter chips (all / pending / watched / archived)
- Long-press action sheet: move to category / delete / reprocess

### 8. Settings
- Reminders toggle + time picker (hour chips)
- "Send test notification" button
- Clear archived items
- FAQ accordion
- Dev-only "Seed demo data" row

### 9. Notifications
- One repeating daily local notification at the user's chosen time (default 6pm)
- Only fires when unreviewed saves exist
- Copy rotates daily
- Tapping deep-links to the Swipe Deck
- Rescheduled on every app open and whenever pending count or settings change
- **Note:** Push notifications (remote) removed from Expo Go in SDK 53 — requires a development build for full notification testing

### 10. Onboarding
- 3-screen intro with a real swipeable practice card
- Sets `hasOnboarded` flag; skipped on subsequent opens

---

## Screens / Navigation (Expo Router)

| Route | Screen |
|---|---|
| `/` | Home dashboard (redirects to `/onboarding` if not yet onboarded) |
| `/onboarding` | 3-screen intro |
| `/deck` | Swipe deck |
| `/import` | Saves Rescue bulk import |
| `/item/[id]` | Card detail view |
| `/category/[name]` | Category filtered list |
| `/settings` | Settings |

Animation: slide_from_right default; deck slides from bottom; onboarding fades.

---

## Data Model

All data is local-first in AsyncStorage via `zustand/persist`.

```typescript
interface SavedItem {
  id: string;
  url: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'unknown';
  title: string | null;
  summary: string | null;
  keyTakeaways: string[];
  todos: TodoItem[];          // { id, text, completed, completedAt }
  toolsMentioned: ToolMention[]; // { name, url }
  category: string | null;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'unsupported';
  reviewStatus: 'unreviewed' | 'kept' | 'archived';
  savedAt: string;
  reviewedAt: string | null;
}

interface UserStats {
  totalSaved: number;
  totalKept: number;
  totalArchived: number;
  totalTodosCompleted: number;
  currentStreak: number;
  lastActiveDate: string | null;
}
```

---

## Backend

### Contract

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

**4xx/5xx:** `{ "error": string }` — **501** means "platform not supported" → friendly toast.

### Deployed backend (Vercel)

- Location: `backend/` subfolder in the repo
- Deployed to: `https://clipsave-two.vercel.app`
- Runtime: Node.js serverless function (`backend/api/process-link.js`)
- Max duration: 30s (configured in `backend/vercel.json`)
- Required env var: `ANTHROPIC_API_KEY`
- AI model: `claude-haiku-4-5-20251001` (fast, low-cost)
- YouTube content: fetches transcript from captions API; falls back to oEmbed title/channel
- Instagram/TikTok: fetches OG meta tags (title + description)

### Local mock backend (for development without a deployed backend)

```bash
node mock-backend.js   # starts on port 3001, returns realistic fake responses
```

Set `EXPO_PUBLIC_BACKEND_URL=http://<YOUR_LOCAL_IP>:3001` in `.env`. Phone and PC must be on the same Wi-Fi network.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| State | Zustand + `zustand/persist` + AsyncStorage |
| Animations | React Native Reanimated 4 + react-native-worklets 0.5.1 |
| Notifications | expo-notifications (local only in Expo Go) |
| Deep links | expo-linking + `Linking.getInitialURL()` |
| Backend | Vercel serverless (Node.js) |
| AI | Anthropic Claude (claude-haiku-4-5-20251001) |
| Typography | Plus Jakarta Sans (400, 500, 800) |
| UI | Linear gradients, spring physics, confetti |

---

## Design Tokens

- Light mode only
- Background: off-white (`#F9F9F7`)
- Surface: light grey cards
- Primary: indigo/violet
- Success: green
- Danger: coral/red
- Border: subtle grey
- Font: Plus Jakarta Sans throughout
- Card radius: 20px, pill radius: 100px
- Animations: spring physics everywhere (no linear tweens)

---

## Copy Voice

Dry, confident, a little mean about your saves graveyard. Not chirpy. Never corporate. Examples:
- "Good morning. Backlog: spotless. Suspicious."
- "Your backlog is judging you."
- "Queue's clear. Nothing is waiting on you. Frame this moment."
- "No links found in there yet. Paste actual URLs — the vibes alone aren't enough."

---

## Project Layout

```
app/                    Expo Router screens
  _layout.tsx           fonts, deep-link intake, notifications, toasts
  index.tsx             Home dashboard + onboarding gate
  onboarding.tsx        3-screen intro with practice swipe card
  deck.tsx              swipe deck
  import.tsx            Saves Rescue bulk import screen
  item/[id].tsx         detail view (player + To-dos / Summary / Tools tabs)
  category/[name].tsx   filtered category list with long-press actions
  settings.tsx          reminders, housekeeping, FAQ
backend/
  api/process-link.js   Vercel serverless function (real AI backend)
  package.json          { "@anthropic-ai/sdk" }
  vercel.json           maxDuration: 30
src/
  api/processLink.ts    backend client (axios, 60s timeout)
  components/           AppText, Button, Confetti, PressableScale, Shimmer,
                        Pill, TodoRow, ToastHost, States, ...
  lib/
    copy.ts             all user-facing strings
    categoryColor.ts    deterministic gradient per category (string hash → palette)
    notifications.ts    schedule / reschedule daily reminder
    platform.ts         embed URL helper + platform detection
    share.ts            extractSharedUrl() + extractAllUrls()
    id.ts               uuid helper
  store/
    useStore.ts         Zustand store + all actions
    useToast.ts         toast queue
    types.ts            SavedItem, TodoItem, ToolMention, UserStats, etc.
  theme.ts              design tokens (colors, font, radius, spacing)
metro.config.js         unstable_enablePackageExports=false (fixes zustand ESM/Metro conflict)
mock-backend.js         local dev mock server (port 3001)
```

---

## Environment Setup

```bash
# 1. Clone and install
npm install

# 2. Create .env (use Set-Content on Windows PowerShell to avoid UTF-16 encoding issues)
Set-Content -Path .env -Value "EXPO_PUBLIC_BACKEND_URL=https://clipsave-two.vercel.app" -Encoding UTF8
# or on Mac/Linux:
echo "EXPO_PUBLIC_BACKEND_URL=https://clipsave-two.vercel.app" > .env

# 3. Start
npx expo start
```

Scan the QR code with Expo Go (SDK 54) on iOS or Android.

**Important:** Environment variables are baked into the bundle at Metro startup. Changing `.env` requires a full restart (`Ctrl+C` then `npx expo start`), not just an in-app reload (`r`).

---

## Known Limitations

- **Notifications in Expo Go**: Remote push notifications were removed from Expo Go in SDK 53. Local notifications work; push notifications require a development build.
- **iOS share sheet**: Full share extension requires a native extension target. Current approach uses `swipefile://` URL scheme + iOS Shortcuts automation. A config plugin can add a proper share extension in a dev build.
- **Instagram/TikTok transcripts**: No transcript available — backend uses OG meta tags only (title + description). AI output quality is lower than YouTube.
- **Vercel hobby plan timeout**: Serverless functions have a 30s max duration. Set in `vercel.json`. Complex links with long transcripts may occasionally time out.

---

## Deployment

### Vercel backend
1. Import `ankitam44/clipsave` repo on vercel.com
2. Set **Root Directory** to `backend`
3. Add env var `ANTHROPIC_API_KEY`
4. Deploy → production URL: `https://clipsave-two.vercel.app`

### Mobile app (future)
- EAS Build for production iOS/Android binaries
- App Store / Google Play submission
- Requires development build for full share extension + push notifications
