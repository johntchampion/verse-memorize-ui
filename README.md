# Verse Memorize — frontend

A mobile-first, installable PWA for daily scripture memorization. Users work
through a fixed bank of 100 verses, three at a time: new verses are drilled
with fill-in-the-blank exercises at increasing blank density, then graduate
into a spaced-repetition review schedule (typed full recall).

This is the client only. It talks to **verse-memorize-api**, an Express +
SQLite backend expected to live in a sibling directory
(`../verse-memorize-api`) and to be running on port 3000.

## Stack

- React 19 + TypeScript + Vite (React Compiler enabled via Babel plugin)
- `react-router-dom` for navigation
- `vite-plugin-pwa` for the manifest and service worker
- Plain `fetch` in a small hand-rolled API client — no data-fetching library
- Plain global CSS (`src/index.css`) — no component library, no CSS-in-JS

## Getting started

```sh
# 1. Start the API (sibling repo; needs JWT_SECRET in its .env)
cd ../verse-memorize-api && npm install && npm run dev   # listens on :3000

# 2. Start this app
npm install
npm run dev                                              # http://localhost:5173
```

The API has no CORS middleware, and none is needed: the Vite dev server
proxies `/api` and `/auth` to `localhost:3000` (see `vite.config.ts`), so the
client always talks same-origin. A production deployment should keep that
arrangement (serve `dist/` and the API behind one origin).

Other scripts:

```sh
npm run build      # tsc -b + vite build + service worker → dist/
npm run lint       # eslint (includes React Compiler rules — keep it clean)
npm run preview    # serve the production build locally
```

## Project layout

```
src/
  api/client.ts        fetch wrapper: JWT header, 401 → forced logout, ApiError
  api/types.ts         mirrors backend response shapes — keep in sync with the
                       API's routes/* when they change
  context/auth.ts      AuthContext + useAuth (split from the provider so fast
                       refresh works)
  context/AuthContext.tsx
  hooks/useApi.ts      fetch-on-mount + loading/error + refetch
  lib/exercise.ts      exercise parsing & answer derivation (see below)
  routes/              one file per screen: Login, Signup, Home, Session,
                       VerseBank, VerseDetail, Settings
  components/          TileExercise, TypedExercise, SlotRow, StreakBadge,
                       ProgressBar
  index.css            the whole design system (tokens + component classes)
```

Routes: `/login`, `/signup` are public; `/`, `/session`, `/verses`,
`/verses/:id`, `/settings` are guarded (`RequireAuth` in `App.tsx`). The JWT is
kept in `localStorage` so a home-screen relaunch stays signed in; an expired
token or any 401 clears it and redirects to `/login`.

## Things to understand before changing the session runner

**The client judges correctness.** `POST /api/attempt` takes a
`correct: boolean` — the server never sees the user's actual answer and never
sends an answer key. The runner therefore fetches each queued verse's full
text (`GET /api/verses/:id`, available for any unlocked verse) and
`lib/exercise.ts` derives per-blank answers by aligning the full text with the
exercise's `blankedText`, token by token. The alignment relies on both sides
using the same whitespace tokenization and word-core regex
(`/[\p{L}\p{N}'’-]+/u`) as the backend's `exerciseBuilder.ts`. **If the
backend tokenizer changes, `lib/exercise.ts` must change with it.**

**Exercise semantics** (product decisions):

- *Tile exercises* (`tile_fill_blank`, learning stages) validate on tap: a
  correct tile fills the next blank and dims; a wrong tile shakes and changes
  nothing. When all blanks are filled the attempt auto-submits. An attempt
  counts as correct only if the run had **zero wrong taps**.
- *Typed exercises* (`type_fill_blank`, review stages) validate only on
  "Check": one free-text input compared against the full verse, forgiving
  case, punctuation, and whitespace (`normalizeTypedText`).
- Session state (current index, taps so far) is purely local; only submitted
  attempts hit the server. Stage changes returned by `/api/attempt` surface as
  a brief toast. Queue exhaustion calls `POST /api/session/complete`.

There's a standalone cross-check script pattern worth reusing if you touch the
parser: import the backend's `buildExercise` and this repo's `parseExercise`
in one `tsx` script and assert that every stage/instance/verse combination
aligns, that every blank's answer appears in the word bank, and that the
`learning_heavy` shown-first-letter splits cleanly.

## Design system

Everything visual is tokens and classes in `src/index.css`, themed around the
printed page: bible-paper background, blue-black ink, "red-letter" carmine for
actions/accents, and gilt gold reserved for streaks and mastery. Verse text is
set in a book-serif stack (Iowan Old Style → Palatino → Georgia) — no font
downloads. When adding UI, use the existing tokens (`--paper`, `--ink`,
`--carmine`, `--gilt`, `--rule`, …) and classes rather than inventing new
colors; gilt specifically means "achievement", don't spend it on chrome.

## PWA

`vite-plugin-pwa` (`registerType: 'autoUpdate'`) precaches the app shell so
repeat launches are fast and the app is installable (manifest + iOS meta tags
in `index.html`; placeholder icons in `public/icons/`). The app is **not**
offline-functional by design — session data and attempt submission require the
network. Note the service worker only registers in production
builds; use `npm run build && npm run preview` to test install behavior.

## Out of scope for v1

Offline exercise-taking, push notifications, dark mode, admin/verse-editing
UI, and anything beyond simple CSS transitions.
