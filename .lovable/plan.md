# "Error: aborted" fix — short, chained background steps

## What's actually happening
Builds are already queued as jobs and the builder already polls every 3 sec. But the server-side runner is still **one long request** (database → `/api/public/generate`, held open up to 15 min). When that connection drops or the server limit hits, the request's abort signal fires and the whole build dies with "aborted". Quick questions ("ask") also still use a direct long request from the browser.

## Fix
1. **Start = instant 202.** `POST /api/public/generate` (browser) only validates, creates the job, kicks it, and returns `202 { jobId }` right away — for every intent, including ask/plan.
2. **New `/api/public/job-status?id=…`** (signed-in, own jobs only) returns `{ status, events after N, result }`. Builder polls it every 3 sec (replaces the current server-fn poll; same data).
3. **Runner works in small pieces.** Each runner call does exactly **one step** (plan, one section, or one edit), saves a checkpoint + events, then returns quickly. If steps remain, it re-kicks the job for the next step (short request each time). No step depends on a connection staying open.
4. **Ignore connection aborts in the runner.** AI calls use their own per-step timeout (e.g. 4 min) instead of the incoming request's signal, so a dropped caller can't kill a step.
5. **Rescue stays.** If a step stalls >2 min, the existing minute check re-kicks from the last checkpoint (3 tries, then Bangla error).
6. **Done = result read back.** On `done`, job stores final html/message; builder loads it from job-status and refreshes preview + chat.
7. Cancel (⏹️) and coin charging per step stay as now.

## Technical details
- `generate.ts`: split job-mode handler into `runStep(job)`; drop `request.signal` from AI fetch, use `AbortSignal.timeout`; after each step `job_push` + `kick_job` if pending steps remain (fire-and-forget via pg_net with short timeout, e.g. 30s wait not required).
- `kick_job`: lower pg_net timeout; add `step` counter to `generation_jobs.input`.
- New route `src/routes/api/public/job-status.ts` verifying bearer via Supabase auth, RLS read of own job.
- `builder.$projectId.tsx`: ask intent uses job flow; poll endpoint switched; remove any streaming reader.
- Verify: run a real build, close tab, reopen, confirm completion and no "aborted" in logs.
