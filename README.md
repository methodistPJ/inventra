# INVENTRA · Season 1: Motion Lab

A playable three-challenge physics workshop for Years 2–6. Name search → select full name + class → **This is me** → build → run → improve. No pupil PIN, password, email or ChatGPT login is added inside the game.

## What is implemented

- First Motion: ramps carry the ball into a goal.
- Mind the Gap: beams create a crossing.
- Launch It: ramp and spring reach an elevated goal.
- Mouse drag/drop and touch placement, part dragging, 5° rotation, delete, reset, keyboard rotation/deletion, accessible position controls, pause/resume, visual hints and optional sound.
- Fixed-step Matter.js physics shared between browser and server; server replay decides completion and scoring.
- Sessions tied to internal `student_id`; stored attempts, best builds, stars, level unlocking and leaderboard.
- Retryable saves. Identical attempt IDs are idempotent. Lower scores never overwrite personal bests. Stars never decrease.
- Supabase schema, server-only integration and dry-run-first roster importer. **No real roster is bundled.**

Only the requested Levels 1–3 exist. Later seasons, a Maker Lab, admin UI and weekly challenges are not included.

## Stack and architecture

The supplied GitHub repo was empty. This implementation uses React 19, TypeScript, Next.js App Router APIs through **Vinext 1 beta**, Vite 8 and a Cloudflare Worker, with Matter.js **0.20.0**. Vinext was chosen for the available Sites deployment path. It is Next.js-compatible, not the standard Next.js server runtime; `npm run build` builds the Worker.

The three-level game uses a thin Canvas renderer over Matter.js rather than adding Phaser. This keeps exactly one physics implementation on the browser and server. `components/game-board.tsx` is the renderer/input boundary; a Phaser renderer could replace it without changing level data or server verification. No Phaser package is installed.

```
app/api/                 Student search, session, attempts and leaderboard routes
components/inventra.tsx  Name picker, challenge map, workshop and results
components/game-board.tsx  Canvas drawing, pointer controls and fixed-step playback
lib/game/                Level definitions, inventory, validation, physics, scoring
lib/server/              HTTP/session safety and persistence adapters
lib/supabase/client.ts   Optional public-key client; never used for pupil records
supabase/migrations/    Production PostgreSQL schema and atomic server-only RPCs
db/ + drizzle/          Separate D1 demo database schema and migration
scripts/import-roster.mjs  Administrative CLI; not a public endpoint
```

`INVENTRA_MODE=demo` (default) uses three synthetic pupils and persistent Cloudflare D1 storage. Demo records are shared among preview visitors and are separate from Supabase. `INVENTRA_MODE=supabase` uses the specified school project; missing credentials fail closed instead of silently substituting demo records. Switching modes does not import demo scores into school records.

## Run locally

Requires Node 22.13+ and npm. `npm ci` uses the committed lockfile.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_giant_dorian_gray.sql
npm run dev
```

Apply the local migration once to a fresh database, not on every start. The preview runs at `http://localhost:5173`. Search **Ada**, **Ben** or **Maya** and confirm. Demo pupils are seeded separately at runtime; migrations contain schema only. Do not delete school data to reset a demo.

For Supabase setup and roster import, follow [SETUP.md](SETUP.md).

## Physics and score contract

Simulation version `motion-1.0.0`: 60 fixed steps/second, stable body creation order, 8 position and velocity iterations, no randomness, no clock-based forces. A run snapshots the build; pause does not edit it. Maximum run length is 1,200 steps (20 simulation seconds). A ball must remain within the goal area for 12 consecutive steps to win. Springs have a 30-step cooldown and fixed launch velocity. Render frame rate never changes the simulated step size; heavily throttled devices may show slower wall-clock playback.

Winning score: `max(100, round(10000 − cost×60 − parts×100 − seconds×30))`. Non-winning attempts score zero. Three stars require success within both the level's cost and time targets; two require the cost target; otherwise one. Levels unlock in order. Leaderboards rank the highest verified score, then earliest best update, then student ID for stable ties. Collected stars are the sum of each level's best star award, so repeated attempts do not inflate them.

The server ignores submitted scores and replays the placements. This prevents fabricated results, but cannot prevent a pupil copying a working build. Name-only selection is **not proof of identity**: another pupil can deliberately choose a classmate. That is the explicitly requested classroom model, not a secure assessment login.

## Checks

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The browser suite expects the dev server and a local Chrome installation. It covers the complete three-level journey, mobile touch, interrupted saving/retry, reloading progress, loading best builds, leaderboards, anonymous requests, cross-origin requests, locked levels and forged scores. Unit checks include reachable/repeatable physics, input limits, roster parsing and a real local PostgreSQL engine (PGlite) for SQL/permissions/transaction checks.

## Delivery status and limits

- The real Supabase project has **not** been changed; credentials were deferred by the user.
- Google Sheet `MASTER DATA GAME`, `Sheet1!A1:E4`, was checked read-only. Columns match `student_id, fullname, year, class, active`. A full roster audit/import is deferred.
- GitHub reported pull access but no push access at setup. Source is prepared locally and in the delivery archive; no GitHub push is claimed.
- The Sites deployment is an **owner-private review preview**. Its platform access gate is separate from the game's pupil selection. Pupils will need an appropriately shared/public school deployment after Supabase configuration.
- Matter.js is fixed-step and repeatable in the tested Chrome/server runtimes; cross-engine bit-for-bit equivalence is not promised. The server result is authoritative.
- The optional read-only WebMCP progress tool is feature-detected. No supported WebMCP validation context was available during browser testing; this optional contract is not claimed verified.
- Real Supabase network integration and school-device rollout must be checked after credentials and the roster are configured.

The initial icons/diagrams are functional game geometry. No external asset licensing or student photographs are involved.
