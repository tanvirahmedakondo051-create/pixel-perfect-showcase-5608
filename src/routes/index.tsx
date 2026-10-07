import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Store, User, Rocket, Newspaper, LayoutDashboard, CalendarDays, MessageSquareText, Sparkle, Globe, Send } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Orbs } from "@/components/site/Brand";
import { PricingCards, Faq } from "@/components/site/Pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hexa AI — বাংলায় বলুন, ওয়েবসাইট বানিয়ে নিন" },
      { name: "description", content: "বাংলায় লিখুন কী চান, Hexa AI কয়েক সেকেন্ডে পুরো ওয়েবসাইট বানিয়ে দেবে। দেখুন, এডিট করুন, প্রকাশ করুন।" },
      { property: "og:title", content: "Hexa AI — বাংলায় বলুন, ওয়েবসাইট বানিয়ে নিন" },
      { property: "og:description", content: "বাংলাভাষীদের জন্য AI ওয়েবসাইট বিল্ডার।" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Store, t: "দোকানের সাইট", d: "পণ্যের ছবি, দাম আর অর্ডার বাটনসহ অনলাইন দোকান।" },
  { icon: User, t: "পোর্টফোলিও", d: "নিজের কাজ সুন্দরভাবে তুলে ধরুন।" },
  { icon: Rocket, t: "ল্যান্ডিং পেজ", d: "পণ্য বা সার্ভিস লঞ্চের জন্য আকর্ষণীয় পেজ।" },
  { icon: Newspaper, t: "ব্লগ", d: "লেখা প্রকাশের জন্য পরিষ্কার ব্লগ লেআউট।" },
  { icon: LayoutDashboard, t: "ড্যাশবোর্ড", d: "চার্ট আর টেবিলসহ ড্যাশবোর্ড।" },
  { icon: CalendarDays, t: "ইভেন্ট পেজ", d: "বিয়ে, সেমিনার বা কনসার্টের পেজ।" },
];

const faqs = [
  { q: "Hexa AI কী?", a: "Hexa AI একটি AI ওয়েবসাইট বিল্ডার। আপনি বাংলায় লিখবেন কী চান, AI পুরো ওয়েবসাইট বানিয়ে দেবে।" },
  { q: "কোডিং জানা লাগবে?", a: "একদমই না। শুধু বাংলায় বর্ণনা দিন, বাকিটা AI করবে।" },
  { q: "ফ্রিতে কতটুকু ব্যবহার করা যাবে?", a: "সাইনআপেই ১০ কয়েন বোনাস, আর প্রতিদিন ১ কয়েন ফ্রি (সর্বোচ্চ ১৫)। ১টি সাইট বানাতে সাধারণত ১-২ কয়েন লাগে।" },
  { q: "ওয়েবসাইট কি প্রকাশ করা যাবে?", a: "হ্যাঁ, এক ক্লিকে প্রকাশ করুন এবং লিংক শেয়ার করুন। চাইলে HTML ফাইল ডাউনলোডও করতে পারবেন।" },
  { q: "পেমেন্ট কীভাবে করব?", a: "বিকাশ বা নগদে পেমেন্ট করে ট্রানজেকশন আইডি জমা দিন। যাচাইয়ের পর Pro চালু হবে।" },
  { q: "মোবাইল থেকে ব্যবহার করা যাবে?", a: "অবশ্যই। Hexa AI মোবাইলের জন্যই বানানো।" },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative isolate overflow-hidden px-4 pb-16 pt-16 md:pt-24">
        <Orbs />
        <div className="mx-auto max-w-4xl text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkle className="size-4 text-cyan" /> বাংলাভাষীদের প্রথম AI ওয়েবসাইট বিল্ডার
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
            বাংলায় বলুন, <br className="md:hidden" />
            <span className="text-brand">ওয়েবসাইট বানিয়ে নিন</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            কী চান সেটা লিখুন — দোকান, পোর্টফোলিও, ইভেন্ট। কয়েক সেকেন্ডে পুরো ওয়েবসাইট তৈরি, দেখুন আর এক ক্লিকে প্রকাশ করুন।
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-7 font-semibold shadow-glow">
              ফ্রি শুরু করুন <ArrowLeft className="size-4 rotate-180" />
            </Link>
            <Link to="/pricing" className="glass inline-flex min-h-12 items-center justify-center rounded-xl px-7 font-semibold">
              দাম দেখুন
            </Link>
          </div>
        </div>
        <LiveDemo />
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-center text-3xl font-bold">কী কী বানাতে পারবেন</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-primary/50">
              <span className="grid size-12 place-items-center rounded-xl bg-primary/20 text-cyan">
                <f.icon className="size-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">কীভাবে কাজ করে</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { i: MessageSquareText, t: "বাংলায় লিখুন", d: "কেমন ওয়েবসাইট চান সেটা সহজ ভাষায় লিখুন।" },
            { i: Sparkle, t: "AI বানাবে", d: "কয়েক সেকেন্ডে পুরো ওয়েবসাইট তৈরি হবে, সাথে সাথে দেখতে পাবেন।" },
            { i: Globe, t: "প্রকাশ করুন", d: "পছন্দ হলে এক ক্লিকে প্রকাশ করে লিংক শেয়ার করুন।" },
          ].map((s, idx) => (
            <div key={s.t} className="glass relative rounded-2xl p-6">
              <span className="absolute right-5 top-4 text-5xl font-bold text-foreground/5">{["১", "২", "৩"][idx]}</span>
              <s.i className="size-8 text-cyan" />
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">সহজ দাম</h2>
        <PricingCards />
      </section>

      <section className="px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">সাধারণ প্রশ্ন</h2>
        <Faq items={faqs} />
      </section>
      <SiteFooter />
    </div>
  );
}

const demos = [
  { prompt: "আমার কাপড়ের দোকানের ওয়েবসাইট বানাও", title: "রঙিন বুটিক", sub: "ঈদ কালেকশন ২০২৬", items: ["জামদানি শাড়ি ৳৪,৫০০", "সুতি পাঞ্জাবি ৳১,২০০", "থ্রি-পিস ৳২,৮০০"] },
  { prompt: "একটা রেস্টুরেন্টের সাইট চাই", title: "ঢাকা কিচেন", sub: "খাঁটি দেশি স্বাদ", items: ["কাচ্চি বিরিয়ানি ৳৩৫০", "ভুনা খিচুড়ি ৳২২০", "শাহী ফিরনি ৳৯০"] },
  { prompt: "আমার পোর্টফোলিও বানিয়ে দাও", title: "তানভীর আহমেদ", sub: "ওয়েব ডিজাইনার", items: ["ই-কমার্স রিডিজাইন", "ব্র্যান্ড আইডেন্টিটি", "মোবাইল অ্যাপ UI"] },
];

function LiveDemo() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [show, setShow] = useState(false);
  const d = demos[idx];
  useEffect(() => {
    setTyped("");
    setShow(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(d.prompt.slice(0, i));
      if (i >= d.prompt.length) {
        clearInterval(t);
        setTimeout(() => setShow(true), 400);
      }
    }, 55);
    const next = setTimeout(() => setIdx((x) => (x + 1) % demos.length), 7000);
    return () => {
      clearInterval(t);
      clearTimeout(next);
    };
  }, [idx, d.prompt]);

  return (
    <div className="mx-auto mt-14 max-w-4xl">
      <div className="glass overflow-hidden rounded-2xl shadow-glow">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="size-3 rounded-full bg-destructive/70" />
          <span className="size-3 rounded-full bg-warning/70" />
          <span className="size-3 rounded-full bg-success/70" />
          <span className="ml-3 font-en text-xs text-muted-foreground">hexa.ai/builder</span>
        </div>
        <div className="grid md:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-end gap-3 border-b border-border p-4 md:border-b-0 md:border-r">
            {show && <div className="self-start rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">✓ ওয়েবসাইট তৈরি হয়েছে!</div>}
            <div className="flex items-center gap-2 rounded-xl border border-input bg-background/50 p-2">
              <p className="min-h-6 flex-1 px-1 text-sm">{typed}<span className="animate-pulse text-cyan">|</span></p>
              <span className="grid size-9 place-items-center rounded-lg bg-brand"><Send className="size-4" /></span>
            </div>
          </div>
          <div className="min-h-64 bg-background/40 p-4">
            {show ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl bg-card p-5 duration-500">
                <p className="text-xs text-cyan">{d.sub}</p>
                <h3 className="text-2xl font-bold">{d.title}</h3>
                <div className="mt-4 grid gap-2">
                  {d.items.map((it) => (
                    <div key={it} className="rounded-lg bg-muted px-3 py-2 text-sm">{it}</div>
                  ))}
                </div>
                <div className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold">অর্ডার করুন</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-24 animate-pulse rounded bg-muted" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
