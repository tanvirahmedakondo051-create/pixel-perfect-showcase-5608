# 4 critical fixes

## What users get
- Bangla text in generated sites never gets broken characters (নারকেল stays নারকেল)
- Stats counters always show real numbers, never "0+"
- Asking for "হোম, মেনু আর যোগাযোগ পেজ" gives real separate pages
- Sites with a database always get a visible login button

## 1. Broken Bangla characters
Finding so far: there is no emoji-cleanup regex in the app code, so the cause is not confirmed yet. "���" (3 marks for one letter) means one Bangla letter's bytes were split apart somewhere in the AI reply pipeline.
- First step: trace every place the AI reply is read, cut or joined (provider reply reading, section joining, section-edit replace, background job saving) and find where bytes are split.
- Fix that place (decode the whole reply safely, never cut text by bytes).
- Add a safety check after every cleanup: if the result contains "�" but the original didn't, keep the original text.
- Any emoji-related regex (app side or the AI-written site rules) uses the `u` flag and never touches the Bangla range.

## 2. Counter shows 0
- Built-in page tidy step adds a counter fixer: numbers in elements with `data-count`/counter classes start at their final value in the HTML, then animate up only when visible (IntersectionObserver), with a timer fallback.
- If any script fails, the final number stays visible — never 0.
- AI rule: write the real number in the HTML text, use `data-count` for animation.
- Hidden sub-pages: counters re-run when a page is shown.

## 3. Multi-page ignored
Confirmed cause: build steps are fixed (header/hero → middle → reviews/footer) and never look at requested pages, so the AI builds one long page.
- Detect page requests in the prompt and approved plan (Bangla + English: হোম, মেনু, যোগাযোগ, আমাদের সম্পর্কে, about, contact, menu, pages…).
- When pages are found: step 1 = header/nav with links to every page + home page; one extra step per remaining page, each wrapped in `data-page="…"`.
- After build, the checker confirms every requested page exists; a missing page triggers one extra step for just that page.
- Log the detected pages for each build.

## 4. Login button missing
Confirmed cause: turning on the database only adds the hidden data helper; nothing guarantees a visible button.
- After build/edit with database on: if there is no login/signup button, add a small built-in login button in the nav plus a sign-in popup (email/password + "Google দিয়ে লগইন"), showing the signed-in name and logout once signed in.
- Stronger AI rule to include login in the nav when the database is on.

## Technical details
- Files: `generate.ts` (reply reading, step planning, page detection, logging), `assets.server.ts` (counter fixer + integrity guard in `postProcessAssets`), `context.server.ts` (section replace integrity), `backend.server.ts` (login widget injection), `verify.server.ts` (requested-pages check).
- No database changes.
