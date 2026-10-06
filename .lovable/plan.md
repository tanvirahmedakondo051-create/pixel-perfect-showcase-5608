# Hexa AI — বাকি অ্যাডমিন প্যানেল (Phase 3 সম্পূর্ণ করা)

Spec ফাইলটি আবার পেয়েছি। সাইট, বিল্ডার, ড্যাশবোর্ড আর অ্যাডমিনের ড্যাশবোর্ড/ইউজার/পেমেন্ট পেজ আগেই তৈরি হয়েছে। এই ধাপে spec-এর বাকি অ্যাডমিন পেজগুলো বানানো হবে, যাতে আপনি নিজেই AI প্রোভাইডার যোগ করে ওয়েবসাইট বানানো চালু করতে পারেন।

## যা বানানো হবে (সব বাংলায়, মোবাইলে টেবিল কার্ড হয়ে যাবে)
1. **AI প্রোভাইডার** (/admin/providers) — যোগ, এডিট, মুছে ফেলা, কানেকশন টেস্ট (সময় দেখাবে), ডিফল্ট সেট, চালু/বন্ধ, ক্রম। সাথে সব প্রোভাইডারের জন্য সাধারণ সিস্টেম প্রম্পট এডিট। API key মাস্ক করা থাকবে।
2. **প্ল্যান** (/admin/plans) — প্ল্যান তৈরি/এডিট/মুছুন: নাম, দাম (৳), দৈনিক টোকেন, সর্বোচ্চ প্রজেক্ট, ফিচার তালিকা, ব্যাজ দেখানো, ডিফল্ট প্ল্যান।
3. **লিমিট** (/admin/limits) — প্ল্যান অনুযায়ী দৈনিক টোকেন, প্রতি মিনিটে রিকোয়েস্ট, সর্বোচ্চ আউটপুট দৈর্ঘ্য, ফ্রি ইউজারের সুইচ (প্রকাশ বন্ধ ইত্যাদি), সবার দৈনিক ব্যবহার রিসেট বাটন।
4. **সাইট সেটিংস** (/admin/settings) — সাইটের নাম, ট্যাগলাইন, লোগো, ঘোষণা ব্যানার, মেইনটেন্যান্স মোড, সাপোর্ট যোগাযোগ, বিকাশ/নগদ পেমেন্ট নির্দেশনা।
5. **মডারেশন** (/admin/moderation) — ফ্ল্যাগ হওয়া প্রজেক্ট (প্রিভিউসহ), কিওয়ার্ড তালিকা এডিট, অনুমোদন / মুছে সতর্ক / ব্যান।
6. **অ্যানালিটিক্স** (/admin/analytics) — ব্যবহারের চার্ট, শীর্ষ ১০ ইউজার, Free→Pro রূপান্তর, আয়ের চার্ট, CSV ডাউনলোড।

অ্যাডমিন মেনুতে এই ৬টি লিংক যোগ হবে।

## আপনার কাজ (বানানোর পরে)
- অ্যাডমিন → AI প্রোভাইডারে অন্তত একটি প্রোভাইডার যোগ করুন (base URL, key, model)।
- আসল বিকাশ/নগদ নম্বর সেটিংসে বসিয়ে দিন (এখন 01XXXXXXXXX বসানো)।

## Technical details
- New route files under `src/routes/_authenticated/admin.*.tsx`; nav array in `admin.tsx` extended.
- Provider CRUD/test/default reuse existing server functions in `src/lib/admin.functions.ts`; add `adminSaveSystemPrompt`, `adminSaveSettings`, `adminSavePlan`/`adminDeletePlan`, `adminModerate` (approve / delete+warn / ban), `adminAnalytics`, all guarded by `has_role` admin check.
- Limits stored in `site_settings` (add columns if missing: rpm, max_output_tokens, free switches) via migration; generate route reads them.
- Settings changes invalidate the `["site-settings"]` query so banner/maintenance update live.
- Charts with recharts; CSV via existing `downloadCsv` helper.
- Verify each page at 390px and desktop with Playwright signed in as the admin.
