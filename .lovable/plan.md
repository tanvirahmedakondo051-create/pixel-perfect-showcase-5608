# বিল্ডার: Lovable-স্টাইল চ্যাট, মেসেজ ডিটেইলস, AI প্রশ্ন, পজ ও রিজিউম

## ১. Lovable-স্টাইল চ্যাট
- AI-এর প্রতিটি উত্তর একটি গোল কোণার কার্ডে: উপরে কাজের শিরোনাম (প্রথম লাইন থেকে), সময় ("৩:২৫ PM"), 🔖 বুকমার্ক (সেভ করা মেসেজ উপরে ফিল্টার করা যাবে), ডানে ⋯।
- কার্ডের নিচে দুটি পিল: **বিস্তারিত** (পুরো লেখা খোলা/বন্ধ) ও **প্রিভিউ** (ওই ভার্সনের সাইট প্রিভিউতে দেখায়; মোবাইলে প্রিভিউ খোলে)।
- প্ল্যান মোডের উত্তরে "📄 প্ল্যান" খোলা/বন্ধ করা অংশ।
- কাজ চলার সময় একটি লাইভ স্ট্যাটাস সারি: "পেজের গঠন দেখছি ›" — ধাপ বদলালে সাথে সাথে বদলায়; চাপলে এখনকার প্রগ্রেস কার্ড (সময়, কয়েন, ধাপের তালিকা) খোলে।
- চিপ সারি ও ইনপুট বক্স আগের মতো থাকবে; কাজ চলার সময় পাঠান বাটনের জায়গায় ⏹️ থামান বাটন।
- AI-এর উত্তরে কোড থাকলে রঙিন হাইলাইট + "কপি" বাটন।

## ২. ⋯ মেসেজ ডিটেইলস
- ⋯ চাপলে নিচ থেকে শিট (ডেস্কটপে ছোট মেনু): ⏱️ কতক্ষণ কাজ করেছে, 🪙 কত কয়েন খরচ, 🔗 লিংক কপি (ওই মেসেজে সরাসরি যাওয়ার লিংক), 📋 লেখা কপি, 🔄 আবার চেষ্টা (একই অনুরোধ আবার পাঠায়)।
- প্রতিটি নতুন AI উত্তরের সাথে সময় ও কয়েন সেভ হবে। পুরোনো মেসেজে "—" দেখাবে।

## ৩. ❓ AI প্রশ্ন পপআপ
- অনুরোধ অস্পষ্ট হলে (যেমন নতুন সাইট, তথ্য কম) AI কাজ শুরুর আগে সর্বোচ্চ ৩টি প্রশ্ন করবে।
- পপআপে (মোবাইলে নিচ থেকে শিট): "প্রশ্ন ১/৩", বাংলা প্রশ্ন, ৩-৪টি দ্রুত উত্তর চিপ, "✏️ নিজের মতো লিখুন" বক্স, এড়িয়ে যান / নিশ্চিত করুন।
- শেষে উত্তরগুলো অনুরোধের সাথে যোগ করে আসল কাজ শুরু হয়। প্রশ্ন বানাতে খুব সামান্য কয়েন লাগে; প্রশ্ন না লাগলে সরাসরি কাজ শুরু।

## ৪. ⏸️ পজ ও রিজিউম
- কাজ শুরুর আগে আনুমানিক খরচ: "এই কাজে ~৮ কয়েন লাগবে" — ব্যালেন্স কম হলে সতর্কতা + শুরু করুন / বাতিল। (আনুমানিক হিসাব আগের কাজের গড় ও সাইটের আকার থেকে; ছোট এডিটে এই ধাপ দেখাবে না।)
- নতুন সাইট বানানো ধাপে ভাগ হবে (হেডার, হিরো, সেকশনগুলো, ফুটার)। প্রতিটি ধাপ শেষে নিজে থেকে চেকপয়েন্ট সেভ হয়।
- কাজের মাঝে কয়েন শেষ হলে: চলমান ধাপ শেষ করে থামবে → "⏸️ ৬৫% সম্পূর্ণ — ৩টি সেকশন হয়েছে, ২টি বাকি" + আপগ্রেড / কাল আসুন।
- কয়েন পেলে "▶️ চালিয়ে যান" — শেষ চেকপয়েন্ট থেকে বাকি অংশ বানাবে; শেষ হওয়া অংশের জন্য আবার কয়েন কাটবে না।
- টুলবারে "চেকপয়েন্ট" তালিকা থেকে যেকোনো চেকপয়েন্টে ফিরে যাওয়া যাবে।
- চেকপয়েন্ট ৭ দিন থাকে; মোছার ১ দিন আগে চ্যাটে নোটিশ দেখাবে, তারপর নিজে থেকে মুছে যাবে।

## Technical details
- Chat history lives in `projects.messages` jsonb, so `time_taken_ms`, `coins_used`, `bookmarked`, `title`, `id`, `created_at` are added as fields on each message object (no new column). Bookmark toggled through an owner server fn.
- Migration: `task_checkpoints` (id, project_id → projects cascade, user_id, task_id, progress_percent int, completed_steps jsonb, pending_steps jsonb, partial_html text, prompt text, status text, created_at, expires_at default now()+7d). GRANT select to authenticated + all to service_role; RLS owner-read only; writes via server. pg_cron daily: delete expired rows; notice computed client-side from `expires_at`.
- `generate.ts`:
  - New `t:"status"` events (step label + step list) and `t:"checkpoint"`, `t:"paused"` events; `done` includes message id, ms, coins.
  - Question phase: `intent:"ask"` request returns `{questions:[{q, options[]}]}` via strict json_schema; client shows modal, then sends answers with the build request.
  - Estimate endpoint (`/api/public/generate` with `intent:"estimate"` or a server fn) from html size + avg `usage_logs`.
  - Staged build for new sites: outline step → per-section steps; after each step charge that step's coins, save checkpoint; if balance ≤ 0 before next step emit `paused` and stop. `resume` with checkpoint id continues pending steps only.
- Builder: split message rendering into `ChatMessageCard`, `MessageDetailsSheet` (Drawer on mobile, DropdownMenu on desktop), `QuestionDialog`, `PausedCard`, `CheckpointsDialog`, `LiveStatusRow`. Code blocks rendered with a lightweight highlighter (`highlight.js` core + html/css/js) and copy button. Stop button wired to existing AbortController.
- Record checkpoint/staged-build rule in AGENTS.md.
