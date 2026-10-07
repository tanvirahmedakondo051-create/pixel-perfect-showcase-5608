# "Google দিয়ে লগইন" for generated sites

## What users get
- Sites with a database get a `hexaDB.loginWithGoogle()` helper; the AI adds a "Google দিয়ে লগইন" button wherever it builds login/sign-up.
- Visitor taps it, picks a Google account, and lands back on the same page signed in. `hexaDB.user()` returns `{ id, email, name, avatar }`.
- Site owners set up nothing. One Hexarly Google sign-in app serves every site (including custom domains).
- A visitor who first signed up with email and password using the same Gmail is linked to the same account.

## What you need to do once (admin)
Google's sign-in needs your own Google app — the built-in Lovable sign-in only covers Hexarly's own accounts, not visitors of the sites users build.
1. In Google Cloud Console, create an OAuth "Web application" client.
2. Add the redirect address `https://hexarly.com/api/public/site-oauth/google/callback` (I'll show the exact one in admin).
3. I'll ask you for the Client ID and Client Secret and store them securely.
Until this is done, the button shows "Google লগইন এখনো চালু হয়নি".

## Flow
```text
site button -> hexarly.com/api/public/db/{project}/google?return=<page>
  -> Google -> hexarly.com/api/public/site-oauth/google/callback
  -> find/create visitor -> back to <page>#hexa_token=...
  -> helper saves the session, clears the address, user() works
```

## Technical details
- Secrets `SITE_GOOGLE_CLIENT_ID`, `SITE_GOOGLE_CLIENT_SECRET` (requested via add_secret).
- Start route `/api/public/db/$projectId/google`: checks backend enabled, `return` must be http(s) and its host must be the project's subdomain host, its verified custom domain, or the app origin (prevents token theft via open redirect). State = HMAC-signed `{projectId, return, nonce, exp 10min}`; redirects to Google with `openid email profile`.
- Callback `/api/public/site-oauth/google/callback`: verify state, exchange code, read verified email/name/picture from Google's userinfo, reject unverified email; upsert `site_users` by (project_id, email); `signSiteToken`; redirect to `return#hexa_token=…&hexa_user=…` (base64 JSON).
- Migration (+ safe-to-rerun file in `supabase/migrations/`): `site_users` add `provider text default 'email'`, `avatar_url text default ''`; `password_hash` gets default `''` so Google users have no password (password login rejects empty hash).
- `backend.server.ts` helper: add `loginWithGoogle()` (navigates), and on load parse `#hexa_token` into saved session; `user()` includes avatar. Prompt docs updated so the AI renders a Google button with an Iconify Google icon.
- Admin → সেটিংস → ব্যাকএন্ড: shows the redirect address to copy and whether the Google keys are set.
- Verify: start route redirect and state check tested locally; full Google round trip needs your keys.
