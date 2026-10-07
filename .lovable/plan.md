# Safe job start when the background runner can't be triggered

## What changes
If the server can't start a new build in the background, the user gets a clear Bangla message ("সার্ভার কাজটি শুরু করতে পারেনি। আবার চেষ্টা করুন।") instead of a raw server error, and the build isn't left stuck as "queued".

## Technical details
- `generate.ts` browser path (job creation, ~line 235): wrap `db.rpc("kick_job", { _id })` in try/catch and also treat a returned `{ error }` as failure.
- On failure: `job_push` with `_events: [{ t: "error", msg }]`, `_status: "error"` (itself in try/catch), `console.error` with jobId + origin, then return `json(503, msg)` (same JSON error shape as other errors).
- Builder already shows JSON `error` messages from this request, so no UI change.
