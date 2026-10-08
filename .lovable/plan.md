# Complete fix — one go

## What users get
- No tech-stack choice: the AI picks a single page or React on its own and never asks.
- Multi-page sites that work: the home page shows on first load, each page appears only once, and "টেবিল বুক করুন" and "অ্যাডমিন" open the right page.
- Every button works: order buttons are on when the site has a database, there is one login window, it opens automatically only on the first visit, and it has no emoji.
- Real photos instead of emoji on dish and product cards.
- A more polished design: the taste pack is always applied, wave dividers sit between sections, and spacing and fonts stay consistent.
- Database setup explains why it failed when tables can't be created.
- "X এর মতো বানাও" with a link copies the style of that site.
- One real test build that is checked in a browser before I say it's done.

## Steps
1. **Mode picker removed (A):** remove the HTML/React toggle from the chat box. The server chooses: React when the request mentions React/Vite/Tailwind or describes a complex app (dashboard, multi-role app); otherwise HTML. Add a rule to the plan and question prompts: never ask about the tech stack.
2. **Page switcher (B):** in the built-in page switcher, show home when the address has no `#` or only `#/`, and run it again on page load. After each build, merge pages that share a name. Point links whose text means booking to the page with the booking form (or its id), and admin links to `#/admin`, creating that page when the site has a database.
3. **Buttons and login (C):** after each build, re-enable `disabled` buttons when the database is on (or remove them when they do nothing). Keep only one login window: if the AI made its own, the built-in one hooks into it. If not, the built-in floating window is used. Auto-open only once, remembered on the visitor's device. Remove emoji from window titles and buttons.
4. **Images (D):** after each build, replace emoji used as card pictures (a lone emoji in an image box) with photos from the matching library category. Add a prompt rule: emoji are never images.
5. **Design (E):** always include the taste pack alongside design-quality. Require a wave divider between major sections and add a small built-in wave style. Add a rule that a disabled button with no reason counts as a failure, and have the automatic check flag it.
6. **Database logs (F):** when table design fails, log the AI's raw reply excerpt and the parse error, then show the reason in chat ("টেবিল বানানো যায়নি: …").
7. **Website reference (G):** a request that contains a link plus "এর মতো / মত / like" runs the existing site analyzer on the server and adds its style summary (colours, fonts, layout, sections) to the build, with the instruction "inspired, original — never copy text or logos".
8. **Final check (H):** run a real build for "হোম, মেনু আর যোগাযোগ পেজ সহ রেস্টুরেন্ট সাইট, লগইন সহ" through the background job, open the result in a headless browser, and check that 3 pages switch, buttons respond, there is one login window, Bangla text is intact, counters are not zero, and there are no emoji pictures. Fix anything that fails and repeat until it passes.

## Technical details
- Files: `ChatComposer.tsx`/builder (toggle removed), `generate.ts` (decideProjectType, reference detection, prompt rules, taste always on), `assets.server.ts` (PAGES router fix, dedupe pages, link retargeting, button enabling, emoji-to-photo, wave CSS), `backend.server.ts` (single-modal hook via `[data-hx-login]` / AI modal detection, localStorage `hx_login_seen`, failure logging), `verify.server.ts` (disabled-button and emoji-image checks).
- Reuses `analyze.server.ts` for references; no new database tables. If any setting changes, it is also saved as a migration file.
- Test build uses the Lovable Cloud session and costs real coins from the test account.
