# AI output reliability fix

## What users get
- Generated sites never show emoji as icons — the code removes them after every build and edit, and swaps food/product/common emoji for matching proper icons.
- When someone asks for 3 pages, the site really has 3 separate pages; missing pages are added automatically.
- Sites with a database always have a login button; the check report shows "লগইন বাটন: ✅/❌".

## 1. Emoji cleanup (done by code, not left to the AI)
- After every build and edit, find emoji in the visible page text and attributes (not inside scripts or styles).
- Known emoji become a matching icon image (Iconify), in the current text colour, sized like the text, hidden from screen readers. Examples: 🍕 pizza, 🍔 hamburger, ☕ coffee, 🍰 cake, 🛒 cart, 📦 package, 📞 phone, ✉️ email, 📍 location, ⭐ star, ✅ check, 🚚 truck, 💳 card, 🔒 lock, 👤 user, ❤️ heart, 🎉 party, 🚀 rocket, 💡 idea, ⏰ clock, and about 40 more.
- Unknown emoji are simply removed, and empty spaces left behind are tidied up.
- The check report shows how many emoji were replaced.

## 2. Multi-page enforcement
- Move the multi-page rule to the very top of the build instructions, in a highlighted block: "If the user asks for N pages, output exactly N top-level `<section data-page>` blocks. One long page is not acceptable."
- Work out which pages were requested from the prompt or approved plan (Bangla and English words: হোম, আমাদের সম্পর্কে/about, যোগাযোগ/contact, মেনু, সার্ভিস, গ্যালারি, ব্লগ, প্রাইসিং, টিম, FAQ, দোকান…, plus "৩টি পেজ"-style counts).
- After the build, compare: if a page is missing, run one small AI step that builds only that page and adds it, plus its menu link. The report shows "পেজ: ৩/৩ ✅" or which page is still missing.

## 3. Login button check
- When the site has a database turned on, check for a login/sign-up button (text like লগইন/সাইন ইন/Login, or a call to the built-in login).
- If it's missing, add a small built-in login button to the header that opens the existing login popup.
- The report shows "লগইন বাটন: ✅" or "❌ যোগ করা হয়েছে".

## Technical details
- `assets.server.ts`: new `EMOJI_ICON` map + `replaceEmoji(html)` using `\p{Extended_Pictographic}` (plus variation selectors/ZWJ sequences), applied to text nodes and alt/title/aria-label only, skipping `<script>/<style>`; called in `postProcessAssets`; returns count for the report.
- `generate.ts`: new `MULTIPAGE_RULE` placed first in build system prompt; `requestedPages(prompt, plan)` helper; after verify, missing pages → one section-style AI call charged as normal.
- `verify.server.ts`: `VerifyReport` gains `requestedPages`, `missingPages`, `emojiReplaced`, `loginButton` (`ok|added|n/a`); `reportText` adds the new lines; login injection uses existing `hexaDB` login helper from `backend.server.ts`.
- No database change.

## Not testable here
Real AI builds still need to be tried by you.
