# বিল্ডার: কোডবেস বোঝা + স্কিল প্যাক + Lovable-স্টাইল চ্যাট ইনপুট

## ১. GitHub ইমপোর্টে কোডবেস বোঝা
- ইমপোর্টের সময় পুরো রিপোর ফাইল তালিকা আনা হবে (সর্বোচ্চ ২০০ ফাইল, বড়/বাইনারি বাদ)।
- প্রতিটি ফাইলের ভূমিকা চিহ্নিত: মূল পেজ (index.html খোঁজা — রুট, `public/`, `docs/`, `dist/`), স্টাইল, স্ক্রিপ্ট, ছবি।
- ফ্রেমওয়ার্ক শনাক্ত: Tailwind / Bootstrap / plain CSS / React-Vite ইত্যাদি (package.json, CDN লিংক, ক্লাস দেখে)।
- লোকাল `style.css` / `script.js` ফাইলগুলো index.html-এ ইনলাইন করে এক ফাইল বানানো হবে, যাতে প্রিভিউ ও এডিট ঠিকভাবে কাজ করে। React-এর মতো বিল্ড-লাগা প্রজেক্ট হলে পরিষ্কার বাংলা বার্তা দেখাবে।
- চ্যাটে ফলাফল কার্ড: "📁 ১২টি ফাইল পেলাম — index.html, style.css... ফ্রেমওয়ার্ক: Tailwind। AI এখন প্রজেক্ট বুঝে গেছে ✅" (ফাইল তালিকা খোলা/বন্ধ করা যাবে)।
- এরপর প্রতিটি এডিটে AI-কে ফাইল ম্যাপ + ফ্রেমওয়ার্ক জানানো হবে, যাতে একই স্টাইল/ক্লাস রেখে সঠিক পরিবর্তন করে।

## ২. স্কিল প্যাক
- নতুন/খালি প্রজেক্টের চ্যাট শুরুতে সাইটের ধরন বাছাই: 🛒 দোকান | 🍔 রেস্টুরেন্ট | 💼 পোর্টফোলিও | 📝 ব্লগ | 🏢 এজেন্সি | 🎓 কোচিং | ✨ সাধারণ।
- টুলবারে বর্তমান প্যাক দেখাবে, পরে বদলানো যাবে। প্রজেক্টে সেভ থাকবে।
- বিল্ড ও প্ল্যান দুই মোডেই ওই প্যাকের বিশেষ নির্দেশনা যুক্ত হবে ("সাধারণ" হলে কিছু না)।
- ৬টি প্যাক বিস্তারিত বাংলা/ইংরেজি নির্দেশনাসহ আগে থেকে দেওয়া থাকবে (দোকান: প্রোডাক্ট গ্রিড, কার্ট, ৳ মূল্য, চেকআউট; রেস্টুরেন্ট: মেনু, গ্যালারি, রিজার্ভেশন, ম্যাপ; পোর্টফোলিও: প্রজেক্ট, স্কিল বার, কন্টাক্ট, CV; ব্লগ, এজেন্সি, কোচিং অনুরূপ)।
- অ্যাডমিন → স্কিল প্যাক: নির্দেশনা এডিট, নতুন ধরন যোগ (নাম, আইকন ইমোজি), চালু/বন্ধ, ক্রম, মুছুন।

## ৩. Lovable-স্টাইল চ্যাট ইনপুট
- ইনপুটের ঠিক উপরে আড়াআড়ি স্ক্রল করা সাজেশন চিপ: "পাবলিশ করুন" / "লাইভ আপডেট", "মোবাইলে দেখুন", "কোড দেখুন", "GitHub-এ পাঠান", এবং সাম্প্রতিক ২-৩টি অনুরোধ (আবার পাঠাতে)। খালি প্রজেক্টে স্কিল-প্যাক অনুযায়ী শুরু করার আইডিয়া।
- বড় গোলাকার ইনপুট বক্স, ভেতরে নিচের সারিতে:
  - বামে [+] — মেনু: ছবি/ফাইল আপলোড, অ্যাসেট, স্কিল প্যাক বদলান।
  - ডানে [বিল্ড ▾] ড্রপডাউন (প্ল্যান / বিল্ড, ছোট ব্যাখ্যাসহ), 🎤 মাইক (ব্রাউজারের ভয়েস টাইপিং, বাংলা `bn-BD`; না থাকলে লুকানো), পাঠান বাটন।
- এখনকার আলাদা প্ল্যান/বিল্ড সুইচ বাটন সরানো হবে।
- মোবাইলে পুরো প্রস্থ, ৪৪px+ টাচ সাইজ।

## Technical details
- Migration:
  - `project_analysis` (id, project_id unique → projects, file_map_json jsonb, framework text, entry_file text, file_count int, analyzed_at) — owner can read via projects ownership; writes only by server.
  - `skill_packs` (id, slug, name_bn, icon, system_prompt, is_active, sort_order, created_at) — public read of active rows; admin write via `has_role`. Seed 6 packs with full prompts. GRANTs included.
  - `projects.skill_pack_id uuid null` → skill_packs (on delete set null); allow in guard trigger as user-editable.
- `github.functions.ts` `importFromGithub`: use `/repos/{r}/git/trees/{branch}?recursive=1`, build file map, detect entry/framework, fetch & inline local css/js, upsert `project_analysis`, append analysis message (`kind:"analysis"`) to messages; return analysis.
- `generate.ts`: load `project_analysis` + skill pack prompt, inject into system prompt for build/plan/diff paths.
- New `skill.functions.ts` (list, set project pack, admin CRUD); admin route `admin.skills.tsx` + nav link.
- Builder: extract new `ChatComposer` component (chips, + menu via Popover, mode DropdownMenu, Web Speech API mic), `SkillPicker`, analysis card renderer.
