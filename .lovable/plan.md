# Payment fix + website hosting lifecycle

## 1. Fix "পেমেন্ট শুরু করা যায়নি" (AuraPay)
The exact cause isn't confirmed yet (AuraPay rejected the request or sent an unexpected reply). Steps:
- Send one test request to AuraPay from the server with the saved key and read its real reply.
- Fix based on the reply (common causes: wrong key, wrong address format, amount format, missing fields, or the payment page running on the preview address instead of the published one).
- Save AuraPay's actual error on the payment record so the admin can see it in Admin → পেমেন্ট.
- Show the user a clearer Bangla message (for example "পেমেন্ট সিস্টেমের কী ভুল" vs "আবার চেষ্টা করুন").

## 2. Preview: auto-stop after 5 minutes
- Each time a user opens a project's preview, a 5-minute preview session starts.
- If the page isn't opened/refreshed again for 5 minutes, the preview stops and shows "প্রিভিউ বন্ধ হয়েছে — রিফ্রেশ করুন".
- Refreshing starts a new 5-minute session.

## 3. Published sites stay up while the plan is active
- Published site stays online as long as the owner's plan is active.
- When the plan ends:
  - **Days 1–7 (grace period):** site still works, but visitors see a banner/popup: "এই ওয়েবসাইটের প্যাকেজ শেষ। আপগ্রেড না করলে X দিন পর ওয়েবসাইট বন্ধ হয়ে যাবে।" The owner also sees this warning on the dashboard.
  - **After 7 days:** if the owner moved to Free and Free doesn't allow publishing, the site goes offline automatically and shows a page "ওয়েবসাইটটি বন্ধ — প্যাকেজ আপগ্রেড করুন".
  - Renewing or upgrading brings the site back online instantly.
- Admin gets a "প্রকাশ করা যাবে" switch per plan (already exists) that decides whether Free sites stay online.

## About "my VPS"
Published sites are served from this app's own server (your-domain/s/site-name). Putting them on your separate VPS is not something this app can deploy to directly. Once you connect your own domain to this app, sites will appear under your domain. If you specifically need files pushed to your VPS, tell me and I'll plan that separately.

## Technical details
- New columns: `projects.preview_expires_at`, `profiles.plan_ended_at` (set when expiry downgrades the user).
- Builder preview: server fn refreshes `preview_expires_at = now()+5min` on load; client timer hides iframe at expiry.
- `getPublishedSite` returns status: `active | grace (days_left) | offline`, computed from owner's plan, `plan_ended_at`, and plan `can_publish`. No cron needed — computed on each visit.
- `/s/$subdomain` renders banner in grace, offline page when expired.
- `auraCreate`: log status + body to `aura_payments.raw`; surface in admin payments.
