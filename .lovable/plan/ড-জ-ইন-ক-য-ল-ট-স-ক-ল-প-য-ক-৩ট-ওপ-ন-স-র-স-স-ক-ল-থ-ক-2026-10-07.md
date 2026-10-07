# ডিজাইন-কোয়ালিটি স্কিল প্যাক (৩টি ওপেন-সোর্স স্কিল থেকে)

## কী হবে
- ৩টি GitHub স্কিল পড়ে প্রতিটি থেকে মূল নিয়মগুলো বের করা হবে:
  1. emil-design-eng — অ্যানিমেশন: spring easing, সঠিক সময় (১৫০–৩০০ms), কী অ্যানিমেট করা যাবে না (layout/width/height নয়, শুধু transform/opacity), reduced-motion মানা।
  2. ui-ux-pro-max — ডিজাইনে বৈচিত্র্য: বেগুনি-গ্রেডিয়েন্ট ক্লিশে বাদ, আসল ফন্ট জোড়া, একসাথে মানানসই রঙের সিস্টেম।
  3. taste-skill — গতানুগতিক ডিজাইন বাদ: সব জায়গায় Inter নয়, একই রকম কার্ড-গ্রিড নয়, অসম লেআউট ও আসল কনটেন্ট।
- মোট ৪৫–৬০টি কাজে লাগানোর মতো নিয়ম, ৫০০–৮০০ শব্দের একটি ইংরেজি সংক্ষিপ্ত নির্দেশনায় (AI ইংরেজিতে ভালো মানে) — পুরো লেখা কপি নয়, নিজের ভাষায়।
- স্কিল প্যাক তালিকায় নতুন প্যাক "🎨 ডিজাইন কোয়ালিটি" যোগ হবে।
- **সাইট-টাইপের সাথে একসাথে কাজ করবে:** এই প্যাকটি সবসময় চালু থাকবে (ইউজারকে বাছতে হবে না) — দোকান/রেস্টুরেন্ট ইত্যাদি বাছাই করলে সেটার নির্দেশনার সাথে এটাও যুক্ত হবে। "সাধারণ" হলেও এটা থাকবে।
- সাইট-টাইপ বাছাইয়ের তালিকায় এটা দেখাবে না। অ্যাডমিন → স্কিল প্যাক-এ এডিট বা বন্ধ করা যাবে (বন্ধ করলে আর যুক্ত হবে না)।

## Technical details
- Fetch the three SKILL.md/README sources via website-fetch, condense to an English prompt (~600–750 words, sections: Typography, Color, Layout & Components, Motion, Anti-patterns).
- Insert one `skill_packs` row via data insert: slug `design-quality`, icon 🎨, name_bn "ডিজাইন কোয়ালিটি", sort_order 0, is_active true.
- `generate.ts`: load the `design-quality` row (if active) and append its prompt to build/plan system prompts in addition to the project's site-type pack; skip duplicate if selected.
- Builder site-type picker / `useSkillPacks` consumers: filter out slug `design-quality`. Admin page shows a "সবসময় যুক্ত" badge for it.
- Prompt-size note: adds roughly 1k tokens per build call (~0.1 coin).
