# AuraPay payments + full plan settings + per-plan AI provider

## 1. AuraPay (replaces manual bKash/Nagad)
- Pricing "নিন" button -> server creates an AuraPay payment and sends the user to AuraPay's checkout page.
- After paying, the user returns to `/payment/success`; the server verifies the payment with AuraPay and activates the plan instantly. A webhook from AuraPay does the same in the background (in case the user closes the tab).
- Each payment is recorded (invoice, amount, status) so it is never applied twice; admin "পেমেন্ট" page becomes a read-only history with status filter.
- Old transaction-ID form is removed; pricing FAQ text updated.
- Admin → সেটিংস: AuraPay on/off. The AuraPay API key is stored as a secret (asked for when building).

## 2. Plan settings page (Admin → প্ল্যান)
Edit dialog becomes a full page `/admin/plans/$id` with sections:
- **সাধারণ**: Bangla/English name, price, feature list, default plan.
- **লিমিট**: daily tokens, max projects, requests per minute.
- **অনুমতি**: can publish, can download HTML, can view code.
- **ব্যাজ ও ডোমেইন**: show Hexa AI badge, custom domain.
- **মেয়াদ**: duration in days (0 = forever). When it ends, the user goes back to the default free plan automatically (checked on each request, like the daily reset).
- **AI প্রোভাইডার**: pick which providers this plan may use (checkboxes) and which one is its default.

These rules are enforced on the server (generate, publish, download/code view hidden in builder), not just hidden in UI.

## 3. Per-plan AI provider
- Generation uses only the plan's allowed providers, starting from the plan's default, falling back within that list. If a plan has none selected, it uses all active providers (current behaviour).
- Builder provider dropdown shows only the plan's allowed providers.

## Technical details
- Migration: `plans` add `can_publish`, `can_download`, `can_view_code`, `rate_limit_per_minute`, `duration_days`, `default_provider_id`; new `plan_providers(plan_id, provider_id)` (admin write, service-role read); `profiles` add `plan_expires_at`; new `aura_payments(user_id, plan_id, invoice_id unique, amount, status, raw)` with own-read/admin-read RLS, writes only from server; drop insert policy on `payment_requests`.
- AuraPay docs only list `POST /api/payment/create` and `/api/payment/verify`. Assumed UddoktaPay-compatible format (header `RT-UDDOKTAPAY-API-KEY`; body `full_name, email, amount, metadata{user_id,plan_id}, redirect_url, cancel_url, webhook_url`; returns `payment_url`; verify with `invoice_id`, check `status === "COMPLETED"` and amount). Will test with the real key and adjust if the response differs.
- Server fn `createAuraPayment` (auth), route `/payment/success` calling `verifyAuraPayment`, webhook `src/routes/api/public/aurapay-webhook.ts` which re-verifies via the verify API before applying (never trusts the body).
- `generate.ts` and `setPublished` read plan flags, plan rate limit, expiry downgrade, and plan provider list.
