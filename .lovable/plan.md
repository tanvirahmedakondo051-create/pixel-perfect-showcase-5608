# বিল্ডার চ্যাট — মোবাইলে Lovable-এর মতো পরিষ্কার করা

আপনার দ্বিতীয় স্ক্রিনশটে যে সমস্যাগুলো দেখা যাচ্ছে সেগুলো ঠিক করা হবে, যাতে প্রথম স্ক্রিনশটের (Lovable) মতো দেখায়।

## সমস্যা → সমাধান
1. **পুরো পেজ ডানে কেটে যাচ্ছে** (মেসেজ বাবল, হেডার, পাঠান/মাইক বাটন দেখা যাচ্ছে না) — উপরের সাজেশন চিপের লম্বা সারি পুরো চ্যাট অংশকে চওড়া করে দিচ্ছে। চ্যাট অংশকে স্ক্রিনের প্রস্থে আটকে রাখা হবে; চিপগুলো শুধু নিজের সারিতে আড়াআড়ি স্ক্রল করবে।
2. **ভাসমান "প্রিভিউ" বাটন ইনপুট বক্সের উপর পড়ছে** — এটা সরিয়ে প্রথম চিপ হিসেবে "👁 প্রিভিউ" রাখা হবে (মোবাইলে)। এতে কিছু ঢেকে যাবে না।
3. **ইনপুট বক্স** — Lovable-এর মতো: চারদিকে সমান ফাঁকা জায়গা, গোল কোণা, ভেতরে উপরে লেখার জায়গা, নিচে বামে [+], ডানে [বিল্ড ▾] পিল-বাটন, 🎤 গোল বাটন এবং পাঠান বাটন — সব এক সারিতে স্ক্রিনের ভেতরে। লেখা না থাকলে Lovable-এর মতো শুধু মাইক দেখাবে, লিখলে পাঠান বাটন আসবে।
4. **চিপ** — Lovable-এর মতো পাতলা বর্ডারের গোল পিল, একটু বড় লেখা, প্রথমটি বাম কিনারা থেকে শুরু (এখন অর্ধেক কাটা দেখাচ্ছে)।
5. **উপরের অংশ হালকা করা** — টোকেন বার ও "সাধারণ" স্কিল ব্যাজ এক সারিতে ছোট করে রাখা হবে, যাতে চ্যাটের জন্য বেশি জায়গা থাকে। হেডারের লম্বা প্রজেক্ট নাম "…" দিয়ে কেটে যাবে।
6. **মেসেজ বাবল** — স্ক্রিনের ভেতরে থাকবে (সর্বোচ্চ ৮৫%), AI-এর উত্তর বাবল ছাড়া সাধারণ লেখার মতো (Lovable স্টাইল), ইউজারের মেসেজ ডানে বাবলে।

"Edit with Lovable" ব্যাজটি শুধু প্রিভিউতে দেখায়; পাবলিশ করা সাইটে থাকবে না (চাইলে সেটিংস থেকে লুকানো যায়)।

## Technical details
- `builder.$projectId.tsx`: grid → `grid-cols-1 md:grid-cols-[380px_1fr]`, chat `<section>` gets `min-w-0 overflow-hidden`; message list `min-w-0`; remove fixed floating preview button, add mobile-only "প্রিভিউ" chip at start of `suggestionChips` when html exists; merge token bar + skill badge into one compact row; header title `min-w-0 truncate`.
- Assistant messages render without bubble background; user bubble keeps `bg-primary`.
- `ChatComposer.tsx`: chip row `w-full min-w-0 overflow-x-auto` with `px-0` (no negative margin), composer `w-full min-w-0`, mode pill bordered `rounded-full`, mic shown when empty / send when text present (both when listening), all controls `shrink-0`.
- Verify with Playwright at 375px width: no horizontal scroll (`scrollWidth === clientWidth`), composer controls visible.
