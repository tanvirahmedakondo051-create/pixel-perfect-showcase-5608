# Hexa AI Builder — Build Plan

A website builder that works fully in Bangla. People describe a website in Bangla, the AI writes it, and they can preview, save, publish and download it. An admin panel runs the whole service. The spec is large, so the work is split into phases. Each phase is usable when it is done.

## Design (taken from your spec)
- Dark deep-purple background (#0f0a1e), indigo (#4f46e5) and cyan (#06b6d4) accents. No pink.
- Hind Siliguri for Bangla text, Inter for English text. Glass-style cards, gradient buttons, floating background orbs.
- Designed for phones first (390px): buttons at least 48px tall, chat box fixed at the bottom, preview opens full screen, admin tables turn into stacked cards. No sideways scrolling.
- Every label, message and toast is in Bangla.

## Phase 1 — Base, landing page, sign-in
- Lovable Cloud for accounts and data. Sign-in with Google or email/password.
- Landing page (/): navbar, hero, a live mini demo, 6 feature cards, 3 "how it works" steps, Free vs Pro comparison, FAQ, footer.
- Pricing page (/pricing): Free vs Pro cards, a bKash/Nagad payment instructions popup (placeholder text), billing FAQ.
- Login (/login) and signup (/signup) pages. After sign-in, users go to /dashboard.

## Phase 2 — Builder and dashboard
- Builder (/builder/$projectId): chat on the left and live preview on the right. On a phone, the preview slides over the chat.
- AI replies stream in as they are written, and the website shows up in a safe preview frame.
- Toolbar: desktop/mobile view, code view, publish, download as HTML.
- Daily token meter (turns red at 90%), suggested prompt chips, auto-save with a Bangla toast, Ctrl+Enter to send, chat box grows as you type.
- A dropdown to pick the AI provider.
- Dashboard (/dashboard): project grid with open, publish, duplicate and delete (with confirmation). A stats sidebar and an empty state.
- Published sites get a public address: /s/$subdomain.

## Phase 3 — Admin panel (/admin, admins only)
- Overview: stat cards, signups chart, token usage chart, recent activity.
- Users: search, filters, plan change, ban/unban, delete, change plan for many users at once.
- Plans: create, edit and delete plans. Free (৳0) and Pro (৳499) are set up from the start.
- Limits: daily token cap per plan, requests per minute, max output length, free-tier switches, a manual reset of daily usage.
- AI providers: add, edit, test the connection (shows response time), delete, set the default, and edit the shared system prompt.
- Site settings: name, tagline, logo, announcement banner, maintenance mode, support contacts.
- Moderation: projects flagged by keywords, an editable keyword list, and approve / delete + warn / ban actions.
- Analytics: usage charts, top 10 users, Free→Pro conversion, revenue chart, CSV export.

## Technical details
- Stack: TanStack Start (React + Vite + Tailwind v4 + shadcn) with Lovable Cloud. The project's router is fixed, so I'll use it instead of a plain React SPA.
- Tables: profiles, plans, projects, usage_logs, ai_providers, site_settings (includes the announcement), flag_keywords, payment_requests, plus a separate `user_roles` table with `has_role()`. Admin status will not be stored on profiles because that can be exploited.
- Provider API keys stay on the server. Only server code can read them. They never reach the browser, and the admin UI only shows them masked.
- Generation runs on the server: it checks the daily limit, then sends `POST {base_url}/chat/completions` with stream:true. If a provider fails, it tries the next active one and shows a Bangla notice. It records token usage from the `usage` field and increments the daily total.
- A per-minute rate limit is counted from usage_logs.
- Daily reset: the server compares `last_reset_date` with today in Dhaka time on each request, so no scheduled job is needed. The admin panel also has a manual reset button.
- Payments are manual. Users submit a bKash/Nagad transaction ID, and an admin approves it, which upgrades their plan.
- Project thumbnails are a scaled-down live preview of the saved HTML, not a screenshot.

## Your input after the build
- Add at least one AI provider in Admin → Providers (base URL, key, model). Generation won't work until you do.
- Make yourself admin: sign up first, then I'll grant your account the admin role.
