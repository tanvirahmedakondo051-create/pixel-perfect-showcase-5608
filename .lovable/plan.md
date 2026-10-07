# Build-jobs table for your own database

## What's actually going on
In the Lovable Cloud database, the build-jobs table and its functions already exist and work. The problem is that the last 5 database changes were saved in a different folder (`drizzle/migrations/`) from the one your own server runs (`supabase/migrations/`). So your self-hosted database never got them:

- the build-jobs table + `job_push`, `kick_job`, `rescue_jobs` (this is your "সার্ভারে সমস্যা হয়েছে" error)
- `projects.dns_status` column
- `site_settings.single_pass_simple` + quality-first defaults
- the free photo, animation and icon tables (and their starter rows)

## Fix
1. Create one combined, safe-to-rerun SQL file that contains all 5 changes, in order:
   - `IF NOT EXISTS` / `CREATE OR REPLACE` everywhere, and policies dropped and recreated, so running it twice is harmless
   - turns on the `pg_net`, `pg_cron` and `pgcrypto` extensions first
   - build-jobs table with every column the code uses (id, project_id → projects, user_id, mode, status, input, origin, events, error, attempts, heartbeat_at, created_at, updated_at), an index, grants, RLS on, and the policy "users see only their own jobs"
   - creates the `job_token` secret if it's missing
   - `job_push` (adds events and updates status, never un-cancels a job), `kick_job` (calls `/api/public/generate` on the app via pg_net with a signed header, short timeout now that builds run one step per call) and `rescue_jobs` (the self-stopping one-minute check), with execute rights for the server only
2. Save it as a new file in `supabase/migrations/` so self-hosted setups pick it up, and also give you a downloadable copy in Files to paste into your SQL editor.
3. Record in the project notes that every database change must also be saved in `supabase/migrations/`, so this doesn't happen again.

## What you need to know
- Your own server must be reachable from the internet at the address saved when a build starts, because `kick_job` calls the app from inside the database.
- Your database must allow the `pg_net` and `pg_cron` extensions (standard on hosted setups; on a bare self-hosted install they may need enabling first).
- Nothing changes in the Lovable Cloud database. Everything there is already in place.
