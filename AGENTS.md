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
