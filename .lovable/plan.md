# Backend reliability + automatic setup

## What users get
- One-click database setup never fails just because the AI's answer was messy: it retries once, and if it still can't design tables, it turns the database on anyway so visitor login/sign-up (and Google login) work, with the note "টেবিল বানানো যায়নি, লগইন চালু হয়েছে".
- When a build request mentions login, signup, database, backend, admin panel, reservation, booking or order (English or Bangla, e.g. লগইন, সাইন আপ, বুকিং, অর্ডার, রিজার্ভেশন, অ্যাডমিন), the database is set up automatically before the site is built. No extra button. The chat shows a step "ডেটাবেস সেট আপ করছি..." and the tables created.
- Server crash protection when a build can't start: already done last time, no change needed.

## Technical details
- Move the schema logic from `setupBackend` into `backend.server.ts` as `autoSetupBackend(db, project, userId, prompt, providers, tokensPerCoin)`:
  - Strip ``` fences, parse first `{` to last `}`; on failure retry once with system suffix "CRITICAL: Output ONLY the JSON object. No explanation, no markdown."; provider fallback kept.
  - Charges coins for tokens used (both attempts), creates tables within limits, sets `backend_enabled = true`, injects the helper into existing `code_html`.
  - Zero tables → `{ ok: true, created: [], warning: "টেবিল বানানো যায়নি, লগইন চালু হয়েছে" }`.
- `setupBackend` server fn becomes a thin wrapper; builder shows `warning` as a toast instead of an error.
- `generate.ts` (runner, new build/edit, not plan/ask): if `!project.backend_enabled` and the prompt matches the keyword regex, and only on the first step (not resumed steps), call `autoSetupBackend`, push a job event, then set `project.backend_enabled = true` locally so `beCtx`, step planning and `injectBackend` apply in the same build. Failures are logged and the build continues without a database.
- Keyword regex covers English words with word boundaries plus Bangla forms; skipped for React projects that lack a VPS? No — React supported too (it already handles `beCtx`).
