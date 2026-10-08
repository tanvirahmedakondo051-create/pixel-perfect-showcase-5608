<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Published sites are served as raw cached HTML from server routes (`/s/$subdomain`, `/api/public/site` keyed by `X-Hexa-Host`) via `src/lib/site-render.server.ts` — fast, no app shell, and lets the admin's VPS nginx proxy/caches by domain.
- AuraPay requests follow the official plugin format (`API-KEY` header, `cus_name/cus_email/success_url`, verify by `transaction_id`, our row id in `metadata.payment_id`) — the only format AuraPay accepts.
- Custom domain status is written only by server functions after a DNS-over-HTTPS NS check against admin nameservers — a DB trigger blocks direct user writes.
- Live sites render `projects.published_html` (snapshot written only by server fns via `publish.server.ts` with a `project_versions` row); builder edits change `code_html` and bump `changes_since_publish` until "লাইভ আপডেট" — keeps half-finished edits off live sites.
- GitHub uses the per-user App User Connector (connectorId "github"); each user's connection key is AES-GCM encrypted in `github_connections` and only used server-side in `github.functions.ts`.
- Builder chat has plan/build modes; plan replies are stored in `messages` with `mode:"plan"` and never touch `code_html`; prompts live in `site_settings.plan_prompt/build_prompt`.
- Publishing/live-update/rollback push the rendered site to the admin's VPS through `deploy.server.ts` → `public/deploy-agent.js` (HMAC-signed with the `deploy_token` app secret, NDJSON step stream mirrored into `projects.deploy_status` for realtime UI); skipped silently when no agent is configured.
- Plan expiry runs hourly via pg_cron → `/api/public/cron/expiry` (auth: `cron_token` app secret): grace = notice page only, then offline, then permanent delete of hosted copies/versions/uploads; days come from `site_settings.grace_days/delete_after_days`.
- Chat uploads go to the private `uploads` bucket via `upload.functions.ts` and are served publicly at `/uploads/{project_id}/{file}`; images reach the AI as signed-URL vision parts; links in a prompt are auto-analysed by `analyze.server.ts`.
- The builder has one chat + preview layout (no tabs); assets open in a popover.
- Skill packs live in `skill_packs` and GitHub import analysis in `project_analysis`; `generate.ts` injects both into plan/build system prompts — keeps site-type expertise and imported-codebase context admin-editable and server-side.
- Coin balances change only through the security-definer `add_coins` SQL function (service role) which also writes `coin_transactions`; a trigger blocks user edits to `profiles.coins` and daily refill runs as a pg_cron SQL job — keeps the ledger and balance consistent and tamper-proof.
- New-site builds run section-by-section in `generate.ts`, charging coins and writing a `task_checkpoints` row after each step; when coins run out the task pauses and `resumeId` continues only pending steps — users never pay twice for finished parts.
- React+Vite projects: AI returns a `files` JSON, the VPS deploy agent `/build` runs npm install (--ignore-scripts) + vite build as the unprivileged `hexabuild` user and returns dist inlined into one HTML stored in `code_html` — the Worker can't run npm, and one HTML reuses the existing preview/publish/deploy path.
- Site backends are virtual tables (`backend_tables` + jsonb `backend_rows` + `site_users`) served by `/api/public/db/{project}/...` with a HMAC visitor token; an injected `window.hexaDB` client means no keys ever reach generated code.
- New HTML builds get a small topic-matched list of free assets (curated_photos/curated_lotties/icon_favorites, optional server-side Pexels cached in pexels_cache) from `assets.server.ts`, and `postProcessAssets` injects only used scripts + image/Lottie fallbacks — keeps prompts small and sites free of broken assets.
- AI generation runs as background jobs (`generation_jobs`): the browser only queues a job and polls `jobs.functions.ts`; the database `kick_job` (pg_net, long timeout, HMAC `job_token`) calls `/api/public/generate` as the runner, and a self-unscheduling `rescue_jobs` cron restarts stalled jobs from the last checkpoint — builds survive closed tabs and Worker restarts.
- Every database schema change must also be saved as a safe-to-rerun SQL file in supabase/migrations/ — self-hosted databases only run that folder.
- Post-build checks run in `verify.server.ts` (structure/images, no AI) then optional `qa.server.ts` screenshot QA via the VPS agent `/screenshot` — Chromium cannot run in the Worker.
