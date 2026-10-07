# Keep building when the tab is closed, plus a better Plan mode

## 1. Builds keep running in the background

### What users will see

- After pressing send, the user can switch tabs, lock the phone or close the app, and the build keeps going.
- When they come back, the chat shows where the build is ("হিরো বানাচ্ছি... (২/৪)"), or the finished site.
- The live progress card stays the same. It refreshes every 3 seconds instead of needing a live connection.
- If the server restarts in the middle of a build, the build carries on from the last finished part by itself, within about a minute. The user doesn't need to press resume.
- Stop (⏹️) still works. It ends the build after the current part finishes.
- Running out of coins still pauses the build, and the "▶️ চালিয়ে যান" button still works as it does now.

### How it works

- Pressing send creates a build job and returns straight away.
- The server runs the job one part at a time. Each part is its own short server call, and when a part finishes it starts the next one. That way no single call runs too long, and nothing depends on the user's browser staying open.
- Each finished part is saved right away (the existing checkpoint), including its progress, coins and partial page.
- A safety check runs every minute and restarts any job that has stopped updating for 2 minutes. It retries a job at most 3 times, then marks it as an error with a Bangla message.
- Edits, the question step and React builds use the same job system, so they also keep running when the tab is closed.

## 2. Plan mode, Lovable style

Plan/Build mode already exists. This change adds:

- **Paid : it costs like build mode.** 
- **Plan popup:** when a plan is ready, a popup (a bottom sheet on mobile) shows its sections, features and design (colours and fonts). The user can choose **অনুমোদন করুন ও বানান**, **পরিবর্তন চাই** (closes the popup so they can type changes in Plan mode) or **বন্ধ করুন**.
- **Approve:** switches to Build mode and starts the build with the approved plan attached, so the site follows it. The coin estimate shows before the build starts.
- Plan messages in chat keep their "📄 প্ল্যান" card, which can reopen the popup.

## Technical details

- New table `generation_jobs` (id, project_id, user_id, status queued|running|paused|done|error|cancelled, kind build|edit|ask|react, input jsonb, step, total, step_label, tokens, coins, checkpoint_id, error, attempts, heartbeat_at, created/updated). GRANT select to authenticated, all to service_role; RLS: owner select only. Writes happen only from the server. Realtime isn't needed.
- `generate.ts` is refactored so its step logic lives in `src/lib/jobs.server.ts` (`runJobStep(jobId)`). It stays a pure move of the existing logic: same prompts, checkpoints, add_coins charging and COINS_OUT pause.
- `POST /api/public/generate`: auth, validation, coin check and estimate stay the same. It inserts a job, starts `/api/public/jobs/step` with an HMAC header (`job_token` app secret), and returns `{ jobId }`.
- `POST /api/public/jobs/step`: verifies the HMAC, claims the job atomically (`update ... where status in (queued,running) and heartbeat_at < now()-20s or step matches`), runs one step, saves the checkpoint, bumps the heartbeat, then starts the next step with a fetch that waits only for response headers. Runs that hit the Worker time limit are picked up by the safety check.
- `GET` status server fn `getJob(jobId)` (requireSupabaseAuth) returns step/label/tokens/coins/status/error; the builder polls every 3s with `useQuery` refetchInterval while the job is active, and on page load fetches the project's latest active job so progress resumes after a refresh or reopening.
- pg_cron every minute → `/api/public/cron/jobs` (cron_token): re-kicks stale running jobs (attempts < 3), errors the rest. Jobs are cleaned up after 7 days, alongside checkpoints.
- Cancel: server fn sets `status=cancelled`; the step runner checks it before each step.
- Plan mode: `isPlan` path skips add_coins, uses a short structured json_schema (sections[], features[], design {colors, fonts, style}) with a capped output, and has a per-day limit from `messages` count. The plan is stored in `messages` (mode "plan", structured jsonb). New `PlanDialog.tsx` component; approve calls generate with mode build plus `approvedPlanId`, and the plan JSON is injected into the build system prompt.
- The builder's stream-reading code is replaced by the polling hook; the progress card props stay the same.
- AGENTS.md gets a rule on step-chained server jobs (the Worker can't hold long requests).