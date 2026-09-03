# Verse Memorize — frontend

A mobile-first, installable PWA for daily scripture memorization. Users work
through a fixed bank of 100 verses, three at a time: new verses are drilled
with fill-in-the-blank exercises at increasing blank density, then graduate
into a spaced-repetition review schedule.

This is the client only. It talks to **verse-memorize-api**, an Express +
SQLite backend expected to live in a sibling directory
(`../verse-memorize-api`) and to be running on port 3000.

**The API's README is the spec for how progression works** — stages, streak
thresholds, the interval ladder, the relearning queue. This app renders that
model; it never decides a transition itself. See
[Progression model](#progression-model) below for what the UI has to know.

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
  lib/exercise.ts      exercise parsing, answer derivation, progression labels
  lib/dates.ts         user-timezone day boundaries (mirrors the API's)
  routes/              one file per screen: Onboarding, Login, Signup, Today,
                       Practicing, AllVerses, Session, VerseDetail, Settings
  components/          TileExercise, TypedExercise, SlotRow, StageLadder,
                       TabBar, ProgressBar, TranslationTag
  index.css            the whole design system (tokens + component classes)
```

Routes: `/login`, `/signup` are public; `/`, `/session`, `/verses`,
`/verses/:id`, `/settings` are guarded (`RequireAuth` in `App.tsx`). The JWT is
kept in `localStorage` so a home-screen relaunch stays signed in; an expired
token or any 401 clears it and redirects to `/login`.

## Translations

Verse text is served in whichever translation the account prefers
(`user.translation` on `GET /api/me`, changed with `PATCH /api/me`). Settings
lists the choices from `GET /api/translations`, which is also the only source
of translation names and licence text — everywhere else, the code alone is
enough, because `GET /api/verses`, `GET /api/verses/:id` and
`GET /api/session/today` each echo a top-level `translation` describing the
text in that same response. `TranslationTag` renders that code beside the
reference on every surface showing verse text, and the full licence appears
once, under the picker in Settings.

Reading the code off the response rather than off the profile is deliberate:
it always credits the words actually on screen. The session runner leans on
the same field — it refuses to start if `GET /api/session/today` and the
per-verse text fetches disagree, since `parseExercise` aligns the two token by
token and a mid-load preference change would otherwise crash it.

Switching translations touches no progress: `user_verse.verse_id` is the same
slug in every translation file, so a verse keeps its stage, streak and
schedule across a change. Signup does not offer a choice; new accounts get the
API's default and change it in Settings.

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

- _Tile exercises_ (`tile_fill_blank`) cover the three learning tiers **and
  `review`**, which blanks every word. They validate on tap: a correct tile
  fills the next blank and dims; a wrong tile shakes and changes nothing. When
  all blanks are filled the Next button activates.
- Tile grading forgives **one wrong tap per 20 blanks** (`missTolerance` in
  `lib/exercise.ts`). A full-density review on a long verse is 70+ taps, and two
  missed reviews pull a verse out of review entirely — treating one slip there
  the same as a slip on a 4-blank learning exercise made demotion far too easy.
  Short exercises earn no slips, so learning grading is unchanged in practice.
  The remaining budget is shown in the header chip once a slip is spent.
- _Typed exercises_ (`type_fill_blank`) are reached **only at `mastered`**. They
  validate on "Check": one free-text input compared against the full verse,
  forgiving case, punctuation, and whitespace (`normalizeTypedText`).
- _The reference phase_ runs after the verse text on every stage but
  `learning_light` (`usesReferencePhase`). The reference turns into
  book/chapter/verse blanks and the tile bank becomes suggestions for each in
  turn; typed exercises hide the reference and ask for it in a second input
  (`referencesMatch`, which forgives abbreviations and roman numerals but not
  the chapter or verse). The API sends `reference` as one opaque string, so the
  split and the decoys are derived client-side in `lib/reference.ts` — a
  reference that won't parse silently skips the phase.
- Reference grading has its **own** budget of one wrong tap per step
  (`REFERENCE_SLIP_PER_STEP`), checked alongside the text's rather than folded
  into it: `missTolerance` is a rate over blanks, and a 4-blank exercise earns
  no slip at all, so a shared budget would fail an attempt on one mistapped
  book.
- Session state (current index, taps so far) is purely local; only submitted
  attempts hit the server. Whatever `/api/attempt` reports surfaces as a brief
  toast and as a line on the completion screen — downgrades and relearning
  included, not just wins. Queue exhaustion calls `POST /api/session/complete`.
- `POST /api/attempt` returns `slotsFilled` as well as `sessionComplete` does:
  a graduation empties a slot and refills it mid-session. Both are rendered.

There's a standalone cross-check script pattern worth reusing if you touch the
parser: import the backend's `buildExercise` and this repo's `parseExercise`
in one `tsx` script and assert that every stage/instance/verse combination
aligns and that every blank's answer appears in the word bank. `review` is the
case worth covering — it blanks every token, so alignment has the least slack
there.

## Progression model

The rules live in the API; three of their consequences are easy to get wrong
here.

**A learning tier advances on 3 correct in a row _within one calendar day_.**
`consecutive_correct` carries across days in the database but is dead for
advancement once `streak_date` isn't today, so any "N / 3" the UI draws has to
be gated on that date — see `SlotRow`. The day is the _user's_, from their
profile timezone: `lib/dates.ts` mirrors the server's `todayInTimezone`, and
comparing against the browser's own day would disagree for anyone travelling.

**A verse can change tier at most once per day, either direction.** After that
the extra correct answers are practice, and `/api/me` reports
`tierChangeUsedToday` so the slot card can say so instead of showing a progress
bar that can't fill.

**A verse pulled out of review still reports `status: 'review'`.** Two failed
reviews set `needsRelearning` and park the verse — no `due_at`, out of the
session — until a slot frees up. Status is derived from `stage`, which doesn't
change while it waits, so `needsRelearning` must be checked _alongside_ status
or a demoted verse counts as kept (`isKept` in `AllVerses`). There is no numeric
strength score and no `decayed` stage; both were removed in the rewrite.

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
