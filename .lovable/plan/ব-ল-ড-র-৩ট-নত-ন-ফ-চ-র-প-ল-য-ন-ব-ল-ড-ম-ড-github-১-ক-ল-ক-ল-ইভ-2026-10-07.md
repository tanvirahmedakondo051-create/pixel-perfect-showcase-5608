# বিল্ডারে ৩টি নতুন ফিচার: প্ল্যান/বিল্ড মোড, GitHub, ১-ক্লিক লাইভ আপডেট

## ১. প্ল্যান মোড + বিল্ড মোড
- বিল্ডারের উপরে দুই ভাগের টগল: [📋 প্ল্যান] [🔨 বিল্ড]।
- **প্ল্যান মোড:** AI একবারে একটি প্রশ্ন করে (সর্বোচ্চ ৩টি), প্রতিটির সাথে ৩-৪টি ট্যাপ করার মতো উত্তর বাটন থাকে। শেষে বাংলায় নম্বর দেওয়া চেকলিস্ট আকারে প্ল্যান দেয়। এই মোডে কোড লেখা হয় না, আর ওয়েবসাইটও বদলায় না।
- প্ল্যানের নিচে "✅ অনুমোদন করে বিল্ড করুন" বাটন থাকবে। চাপলে বিল্ড মোড চালু হয় এবং প্ল্যান অনুযায়ী ওয়েবসাইট তৈরি শুরু হয়।
- **বিল্ড মোড:** আপনার দেওয়া "৫টি নিয়ম" নির্দেশনা ডিফল্ট হিসেবে থাকবে।
- Admin → সেটিংসে দুটি নির্দেশনাই (প্ল্যান ও বিল্ড) আলাদা করে বদলানো যাবে। HTML-only কড়া নিয়মটি সবসময় বিল্ড নির্দেশনার সাথে যুক্ত থাকবে।
- প্রতিটি মেসেজে লেখা থাকবে সেটি কোন মোডে পাঠানো হয়েছিল। প্ল্যানের মেসেজগুলোও টোকেন লিমিটের হিসাবে ধরা হবে।

## ২. GitHub সংযোগ
- টুলবারে "🐙 GitHub" বাটন থাকবে। চাপলে ইউজার নিজের GitHub অ্যাকাউন্টে লগইন করবে, তারপর তার নাম ও ছবি দেখাবে। সংযোগ বিচ্ছিন্ন করার অপশনও থাকবে।
- **GitHub এ আপলোড:** একটি বক্স খুলবে। সেখানে প্রজেক্টের নাম থেকে রিপোর নাম আপনাআপনি বসানো থাকবে, Public/Private বেছে নেওয়া যাবে, আর বাংলায় কমিট মেসেজ লেখা যাবে। এক ক্লিকে রিপো তৈরি হবে এবং index.html আপলোড হবে। সফল হলে রিপোর লিংক দেখাবে। একই রিপোতে পরে আবার আপলোড করলে নতুন কমিট যোগ হবে।
- **GitHub থেকে ইমপোর্ট:** দুটি ট্যাব থাকবে। "আমার রিপো" ট্যাবে নিজের রিপোর তালিকা থেকে বেছে নেওয়া যাবে, "লিংক" ট্যাবে যেকোনো পাবলিক রিপোর লিংক দেওয়া যাবে। রিপো থেকে index.html লোড হয়ে প্রিভিউতে দেখাবে, তারপর চ্যাটে কাজ চালিয়ে যাওয়া যাবে।
- **কমিট ইতিহাস:** পাশের প্যানেলে সংযুক্ত রিপোর কমিটগুলো সময়সহ দেখাবে।
- GitHub টোকেন এনক্রিপ্ট করে শুধু সার্ভারে রাখা হবে। ইউজারের ব্রাউজার কখনো টোকেন দেখতে পাবে না।
- **আপনার করণীয় (একবার):** github.com/settings/developers এ একটি GitHub OAuth App বানিয়ে প্রজেক্টে যুক্ত করতে হবে। বিল্ডের সময় এর জন্য একটি সেটআপ কার্ড আসবে, সেখানে ধাপে ধাপে নির্দেশনা থাকবে।

## ৩. ১-ক্লিক লাইভ আপডেট + ভার্সন
- প্রকাশিত সাইটে নতুন পরিবর্তন থাকলে টুলবারে "🔄 লাইভ আপডেট" বাটন দেখাবে, সাথে ব্যাজ থাকবে (যেমন "৩ টি চেঞ্জ")। ব্যাজের সংখ্যা হলো শেষবার প্রকাশের পর যতবার AI ওয়েবসাইট বদলেছে।
- এক ক্লিকেই লাইভ হয়ে যাবে। কোনো বক্স খুলবে না, ডোমেইনও আবার দিতে হবে না। শেষে দেখাবে "✅ লাইভ আপডেট হয়েছে!"
- AI বাংলায় ছোট পরিবর্তনের তালিকা লিখে দেবে (যেমন "হিরোতে নতুন বাটন", "রং বদল")।
- **ভার্সন ইতিহাস:** প্রতিটি প্রকাশ v1, v2... হিসেবে তারিখ ও পরিবর্তনের তালিকাসহ সেভ থাকবে। প্রতিটির পাশে "রোলব্যাক" বাটন থাকবে, চাপলে ওই ভার্সন আবার লাইভ হবে।
- প্রকাশ বন্ধ করার বাটনও থাকবে।
- **গুরুত্বপূর্ণ পরিবর্তন:** এখন বিল্ডারে বদলালেই লাইভ সাইট সাথে সাথে বদলে যায়। এরপর থেকে লাইভ সাইটে শুধু সর্বশেষ প্রকাশিত ভার্সন দেখাবে। ফলে আপনি "লাইভ আপডেট" না চাপা পর্যন্ত অর্ধেক কাজ করা পরিবর্তন সাইটে যাবে না।

সব লেখা বাংলায় থাকবে, আর ৩৯০px মোবাইলে সব ঠিকমতো কাজ করবে।

## Technical details
- Migration: `projects` + `mode`-agnostic columns `published_html text`, `published_code_hash text`, `published_version int`, `changes_since_publish int default 0`, `github_repo text`; trigger keeps these admin/server-only. `project_versions` (id, project_id, version_number, code_html, changelog_bn, created_at; owner SELECT via project ownership, writes service_role). `github_connections` (id, user_id unique, github_username, avatar_url, access_token_encrypted, created_at; service_role only). `site_settings` + `plan_prompt`, `build_prompt` (default = given texts). All with GRANTs + RLS.
- `api/public/generate.ts`: accept `mode: "plan"|"build"`; plan mode uses plan_prompt, skips extractHtml/code_html update, returns text (quick-tap options parsed from a `[[option]]` line format); build mode uses build_prompt + STRICT_RULE and increments `changes_since_publish`. Approve sends the plan text as the build prompt.
- `site-render.server.ts` serves `published_html` (fallback code_html for existing sites, backfilled in migration).
- New `publish.functions.ts`: `liveUpdate` (hash compare, AI changelog via the first allowed provider with short max_tokens, fallback generic text, insert version, set published_html/hash, reset counter), `listVersions`, `rollbackVersion`; `setPublished` creates v1.
- GitHub per-user OAuth via the App User Connector (connectorId "github", scopes `read:user`, `repo`), connection key AES-GCM encrypted with `APP_USER_CONNECTION_KEY_SECRET` in `github_connections`; server fns: status/disconnect, listRepos, pushToGithub (create repo + PUT contents with sha), importFromGithub (own repo or public URL via raw fetch), listCommits.
- UI: mode toggle + option chips in builder chat; `GithubMenu`, `PushDialog`, `ImportDialog`, `CommitsPanel`, `VersionsPanel` components; Admin settings prompt editors.
