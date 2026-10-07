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
