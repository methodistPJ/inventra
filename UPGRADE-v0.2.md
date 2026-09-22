# INVENTRA v0.2 — school upgrade

This update keeps the existing Vinext/React/Matter.js app, Cloudflare deployment, pupil search and sessions. No roster re-import or new credentials are needed. Do not upload an `.env` file, service-role key, pupil CSV, `node_modules`, `dist`, or `.wrangler` to GitHub.

## Upgrade in this order

1. In your existing Supabase project, open **SQL Editor → New query**.
2. Copy the whole contents of `supabase/migrations/202609220002_motion_expansion.sql` into the editor and run **once**. Use this NEW file only. Do **not** run the original setup SQL again. It adds Levels 4–10, a protected weekly-results table, and updates the save function. Existing pupils, sessions, progress and personal bests remain intact. Keep a database backup under your school's usual backup policy.
3. In GitHub Desktop, add/open this existing local repository, switch to `motion-lab-v02`, and publish/push that branch to `methodistPJ/inventra`. Review the changes, then merge it into `main` on GitHub **after step 2 succeeds**.
4. Let the existing Cloudflare GitHub-connected deployment build `main`, or use **Deployments → Retry deployment** for the updated commit. Preserve your current build/deploy commands and runtime secrets. Production must remain `INVENTRA_MODE=supabase`; leave `INVENTRA_DEMO_PREVIEW` unset. This opt-in is for synthetic-pupil local tests only.
5. Open the school's existing Workers URL. Confirm ten challenge cards. Select your own authorised test pupil, confirm “This is me”, add a part with one tap, finish a challenge, refresh, and check the saved result. Check the weekly board and use a phone in portrait. Do not select another real pupil to test.

If saving fails after deployment, check that step 2 ran successfully and the existing server-side Supabase key is still configured. Do not expose the key with a `NEXT_PUBLIC_` prefix. The private ChatGPT Sites preview is a separate synthetic-pupil demo, not the school production database.

## Compatibility and rewards

- All original v0.1 records remain. Original Levels 1–3 physics and score scale are preserved; their historical score weighting uses the old component prices so an existing personal best stays comparable. Displayed build costs use the requested v0.2 prices. Historical records retain the costs actually recorded at the time; new weekly results use v0.2 prices only.
- The migration accepts old-server saves for Levels 1–3 during rollout. If needed, roll Cloudflare back to the previous app deployment; leave the additive database migration in place. Do not delete tables or restore the old SQL over the database.
- Maker XP = 100 per completed level + 25 per earned star. Coins = 20 per completed level + 5 per earned star. Maker Level increases every 250 XP. These are derived from persisted maximum stars, so replays do not farm rewards. Coins are a progress counter only; no shop is included.
- Badges: First Build, Motion Explorer (3 levels), Gentle Landing, Motion Master, Thirty Stars.
- Weekly challenges rotate through Levels 1–3 so the school can revisit approachable puzzles. The clock resets Monday at 00:00 Malaysia time. Each category retains that pupil's best successful cost, parts and time separately. Different builds may hold different category records. One participating pupil adds 10 class points per week, regardless of retries. Only signed-in pupils can read rankings; inactive pupils are excluded.
- Name-only identity remains deliberately low-friction, not verified authentication. It cannot prevent a pupil choosing somebody else's name. Server sessions, private database access and replayed physics protect subsequent requests, not the initial identity claim.

## Development verification

`npm ci`, `npm run typecheck`, `npm test`, `npm run build`.

For a local synthetic-pupil preview, set `INVENTRA_DEMO_PREVIEW=true` before `npm run dev`. The school production build has no D1 dependency. Local tests need the original and new Drizzle migrations applied to the local D1 store. Apply only missing migrations, never replay existing ones. `npm run test:e2e` uses Chrome and `PLAYWRIGHT_BASE_URL` (default `http://localhost:5173`). No test uses the school pupil roster.
