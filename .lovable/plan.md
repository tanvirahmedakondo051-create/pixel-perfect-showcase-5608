# 6 fixes + Lovable-style plan flow

## What users get
- Sub-pages (About, Contact...) never show blank; unknown links go to Home.
- Full professional sites with no quality cuts; only useless repeat AI calls removed.
- After every build, a short "চেক রিপোর্ট" in chat: pages, menu links, empty sections, broken photos — and what was auto-fixed.
- A new "Taste" design pack (Stripe/Linear/Vercel-level polish) always added on top of the site type.
- Screenshot check: each page is photographed, AI looks for blank/broken/overlapping parts and fixes them automatically.
- Plan card like Lovable: title, "ইউজার কী পাবে" bullets, buttons রিভিউ / স্কিপ / অনুমোদন.

## 1. Sub-page blank fix
- Replace the AI-written page switcher with one fixed, injected router script (added after every build/edit, replacing any old one).
- Rules: show only `section[data-page=current]` plus shared parts (header/footer without data-page); nav links matched by `#/name`; unknown or empty hash → home; back/forward work; scroll to top on change.
- If a page name in the menu has no section, the verify step (3) flags and fixes it.

## 2. Quality first, waste cut
- Keep all premium rules and multi-part builds.
- Remove: repeat retries that resend the same request after an identical failure, duplicate skill/asset text in later parts, the extra AI changelog call when nothing changed.

## 3. Post-build auto-verify (no AI cost)
- Server-side check of the final page: every menu `#/x` has a matching page section, no empty sections, every image link is from the library/uploads and answers OK (quick HEAD check, cached).
- Fixable problems (missing page, broken photo) fixed automatically: broken photo swapped for a library photo; missing page → one small AI section call.
- Result shown as a chat card: "✅ ৫টি পেজ, ১২টি লিংক ঠিক আছে • ১টি ছবি বদলানো হয়েছে".

## 4. Taste skill pack
- New always-on pack "✨ টেস্ট" (condensed, own words): restrained palettes, big confident type, generous whitespace, subtle borders over heavy shadows, precise grids, crisp micro-interactions, real product-like details. Editable in Admin → স্কিল প্যাক. Saved as a migration file too.

## 5. Screenshot QA
- Headless Chromium cannot run on the app's server, so it runs on your VPS agent (new `/screenshot` endpoint, HMAC-signed like deploy).
- For each page: phone + desktop screenshot → vision AI (small call) → JSON list of problems → one targeted section fix → re-check once.
- If no VPS agent is set up, this step is skipped silently and only step 3 runs. Costs a small number of coins; admin toggle in Admin → লিমিট to turn it off.

## 6. Plan flow
- Plan format: `# Title`, `## ইউজার কী পাবে` bullets, then sections/features/design.
- Chat plan card shows title + bullets + 3 buttons:
  - রিভিউ → opens the full plan popup
  - স্কিপ → builds straight from the original request without the plan
  - অনুমোদন → chat shows "✅ প্ল্যান অনুমোদিত — বানানো শুরু হচ্ছে..." and builds from the saved plan (plan text not pasted)

## Technical details
- `site-render`/`assets.server.ts`: `HEXA_ROUTER` script injected in `postProcessAssets`; strip AI hashchange scripts.
- New `src/lib/verify.server.ts` (structure + image checks, auto-fix) called at end of build job before done event; result event `kind:"verify"`.
- `deploy-agent.js`: `/screenshot` using Playwright Chromium (installer adds it); `src/lib/qa.server.ts` calls agent then vision model via admin provider; runs as an extra job step with checkpoint.
- `generate.ts`: PLAN_FORMAT update, dedupe retries, skip changelog when diff empty; new `qa_screenshots` setting in `site_settings`.
- Builder: `PlanCard` component; skip sends original prompt with `skipPlan`.
- Migrations: taste pack insert + `qa_screenshots` column, safe to rerun.

## Not testable here
Screenshot QA needs your VPS agent reinstalled; real builds still to be tried by you.
