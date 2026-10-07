# বিল্ডারে ৮টি নতুন ফিচার

These are big changes, so they'll be built in 3 rounds. After each round you can check the work before the next one starts.

## রাউন্ড ১ — AI কে দ্রুত ও কম খরচে চালানো (৫, ৬, ৮)
**৫. শুধু পরিবর্তিত অংশ (Diff Editing)**
- When a website already exists, the AI sends back only the changed part, not the whole website again.
- The builder fits that part into place by itself.
- If the patch doesn't fit, the AI is asked again automatically to send the full website, so nothing breaks.
- The token meter shows how much was saved, e.g. "৭০% সেভ 🎉".

**৬. স্মার্ট কনটেক্সট**
- The AI only gets the last 5 messages plus the relevant part of the website. For example, saying "হেডার" sends only the header.
- An outline of the page's sections is always sent, so the AI knows the whole structure.

**৮. চ্যাট সারসংক্ষেপ**
- After every 10 messages, a short Bangla summary of the older chat is saved. Format: "User wants X. Tried Y. Current: Z."
- The AI gets this summary instead of the old messages.
- The dashboard gets a new "সেভ হওয়া টোকেন" stat.

## রাউন্ড ২ — পরিকল্পনা, টেমপ্লেট ও পছন্দ (২, ৭, ৪)
**২. ৪ ধাপের প্ল্যান মোড** — replaces the current plan mode.
- The steps are: স্পেসিফাই (purpose, audience, pages) → প্রশ্ন (up to 3, with tap-to-answer buttons) → প্ল্যান (sections, colours, pages) → টাস্ক (Bangla checklist).
- A progress bar at the top shows the steps. Every step has a "পেছনে যান" button.
- Approving switches to বিল্ড মোড and building starts automatically.

**৭. টেমপ্লেট**
- 12 ready-made templates on the dashboard and on an empty builder: Portfolio, Restaurant, Shop, Blog, Landing, Agency, Wedding, Doctor, School, Event, Salon, Real Estate.
- Pick one and write a line about your business. The AI keeps the template's structure and changes the text and colours.

**৪. আমার পছন্দ (Memory)**
- Say "মনে রাখো..." in chat and that preference is saved.
- New projects use it automatically and show "আগের পছন্দ অনুযায়ী ✨".
- A new "আমার পছন্দ" page lets you edit or delete saved preferences.

## রাউন্ড ৩ — প্রিমিয়াম UI ও ব্যাকএন্ড (১, ৩)
**১. প্রিমিয়াম কম্পোনেন্ট**
- A new "প্রিমিয়াম" section in the asset library, with 50+ buttons, cards, loaders and toggles, plus animations such as split text, glitch, magnetic buttons and scroll effects.
- It has search, a live preview, and 1-click insert.
- These components will be written by us in the Uiverse / React Bits style, not copied from those sites.
- Admins can add or delete components.
- The AI is told to prefer this style for buttons, cards and animations.

**৩. ১-ক্লিক ব্যাকএন্ড**
- A "🔌 ব্যাকএন্ড" button in the toolbar with three switches: লগইন, ডেটাবেস, পেমেন্ট.
- These run on Hexa's own server, so the user doesn't have to set anything up. Each website gets its own separate space for users and data.
- **লগইন:** visitors to the generated site can sign up and log in for real, with email and password.
- **ডেটাবেস:** the AI suggests what to store (e.g. "অর্ডার: নাম, ফোন, ঠিকানা"). After the user confirms, it's created, and the site's forms save real data. The site owner can see the data from a "ডেটা" tab in the builder.
- **পেমেন্ট:** the site's buy buttons open a real AuraPay payment. This uses the AuraPay key each site owner adds in their own settings. Payments do not go to your AuraPay account.

## Technical details
- Round 1: in generate.ts build mode, when code_html exists, send outline + matched section (keyword→selector map: header/nav/hero/footer/etc., fallback largest-section match) and request `<<<FIND ... === REPLACE ... >>>` search/replace blocks; apply server-side; on any failed match retry once with full-HTML mode. Store `tokens_saved` estimate on usage_logs (new column). `chat_summaries` table (project_id, summary_text, up_to_index, created_at; owner read, service write); summarize after each 10 new messages with the same provider.
- Round 2: `project_specs` (project_id unique, spec_json, clarifications_json, plan_json, tasks_json, step) with owner read; plan mode returns strict JSON per step through `[[json]]`-free structured prompt and parses it; `user_preferences` (user_id, pref_key, pref_value; owner CRUD RLS), detected via "মনে রাখো" prefix plus AI extraction; templates as static HTML files in `src/lib/templates/`.
- Round 3: `ui_components` (name, source, category, html_code, css_code, preview_url; signed-in read, admin write), seeded via migration. Backend: `site_backends` (project_id, auth_on, db_on, pay_on, schema_json, aurapay_key encrypted), `site_users` (project_id, email, password_hash, …), `site_records` (project_id, collection, data jsonb); public routes `/api/public/site-api/*` (CORS, per-project, rate checks, input validation); a small `hexa.js` SDK injected into published HTML; build prompt gets SDK usage docs only when toggles are on.
