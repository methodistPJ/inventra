# Connect the school database

The playable preview works with demo pupils. These steps activate real pupils in `idwldwefhbmyknimfwgz`; no live database change or roster import has been performed yet.

## 1. Apply the schema

In the Supabase project's SQL editor, review and run `supabase/migrations/202609210001_motion_lab.sql` once. Alternatively apply it using the Supabase CLI linked to that project. It creates the seven requested game tables plus private session and rate-limit tables. It inserts only the three level definitions. Do not rerun the initial migration over existing tables; use a new migration for later changes.

All tables have RLS enabled. `anon` and `authenticated` receive no direct access to these tables or RPCs. Only the server's service-role client can search pupils, create sessions, save replay-verified attempts, read progress or import the roster.

## 2. Configure secrets

For local work, copy `.env.example` to ignored `.env.local`; use the hosting provider's environment/secrets interface for deployment. Never paste the service-role key into chat, put it in a URL or commit it.

| Variable                        | Value / scope                                               |
| ------------------------------- | ----------------------------------------------------------- |
| `INVENTRA_MODE`                 | `supabase` once migration and import are complete           |
| `SUPABASE_URL`                  | `https://idwldwefhbmyknimfwgz.supabase.co`                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service-role key; **server secret only**           |
| `NEXT_PUBLIC_SUPABASE_URL`      | Same project URL; safe public configuration                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon/publishable key for the optional browser client |

This release routes pupil operations through `/api`, so the public client is not needed for login or scores. Do not expose a service key under any `NEXT_PUBLIC_` variable. Hosted Sites environment values must be configured through Sites, not committed files. Rebuild after changing build-time public variables. Restart/redeploy after changing runtime values.

## 3. Dry-run the roster

Source: [MASTER DATA GAME](https://docs.google.com/spreadsheets/d/1JCYQarwp48IKvD5v5crO9LPPxG5M092r5m02K9zgwy4/edit), tab `Sheet1`. The importer reads it; it never edits the Google Sheet.

Simplest route: download the current tab as CSV and store it inside ignored `private-roster/roster.csv`. Keep that file out of commits, deployment archives and public folders.

```sh
npm run import:roster -- --csv=private-roster/roster.csv
```

The dry run validates required headers, unique stable student IDs, full names, Years 2–6, class/year consistency and explicit TRUE/FALSE active flags. Duplicate names are counted but not merged. The output reports counts and an approval hash without printing pupil names.

With Supabase server credentials configured it also reports new pupils, updates, name changes and explicit deactivations. Review these counts before applying:

```sh
npm run import:roster -- --csv=private-roster/roster.csv --apply --approve-hash=HASH_FROM_DRY_RUN
```

If existing student IDs have changed names, the importer stops. Check that IDs still refer to the same pupils. Add `--allow-name-changes` only for intentional corrections. IDs must never be regenerated or reassigned.

Optional direct private-Sheet route: set `GOOGLE_SHEETS_ACCESS_TOKEN` in the administrative environment with read-only spreadsheet access, then use `--sheet` in place of `--csv=...`. The verified current read boundary is `Sheet1!A1:E1000`; the importer stops if the boundary is full so a growing sheet cannot be silently truncated. It does not publish the sheet or embed an access token in the app.

Imports execute in one PostgreSQL transaction. Same IDs are updated; new IDs are inserted. Rows absent from the supplied input remain unchanged. Only an explicit `active=FALSE` deactivates a pupil. Existing attempts/progress are preserved. Deactivated pupils disappear from search and their sessions can no longer access progress.

## 4. Verify before school use

Search a partial name, check full name + class, choose **This is me**, complete Level 1, reload, sign out and select the same pupil again. Check that stars, best build and leaderboard restore. Test a second pupil and one inactive pupil. Confirm lower scores do not replace a best. Check the production browser bundle and requests contain no service-role key.

Name-only selection is a deliberate usability choice, not identity verification. Use this release for low-stakes classroom play. The app does not require a PIN or password, and no teacher authentication/admin console has been added.

## 5. GitHub and deployment

The provided GitHub repo was empty and the connected GitHub account reported no push permission. The source archive contains the full app, lockfile, migration, tests and this guide. Grant the relevant GitHub connection write access, then push this prepared project to `methodistPJ/inventra`; do not overwrite unrelated future work.

The current app uses the Cloudflare/Sites runtime. A standard Next.js/Vercel deployment would require replacing the Vinext build configuration and excluding the demo D1 adapter; do not assume this Worker build can be uploaded to Vercel unchanged. Supabase remains the production database through HTTP in either deployment architecture.

The owner-private preview can be reviewed immediately with demo pupils. School/public access is a separate deployment step after the production environment, roster and full name visibility have been checked. No later seasons are included.
