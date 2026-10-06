import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Orbs } from "@/components/site/Brand";
import { PricingCards, Faq } from "@/components/site/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "দাম — Hexa AI" },
      { name: "description", content: "Hexa AI-এর ফ্রি ও প্রো প্ল্যানের তুলনা। বিকাশ ও নগদে পেমেন্ট।" },
      { property: "og:title", content: "দাম — Hexa AI" },
      { property: "og:description", content: "ফ্রি দিয়ে শুরু করুন, দরকার হলে প্রো নিন।" },
    ],
  }),
  component: PricingPage,
});

const billingFaq = [
  { q: "কীভাবে পেমেন্ট করব?", a: "প্ল্যান বেছে নিয়ে বিকাশ বা নগদে Send Money করুন, তারপর ট্রানজেকশন আইডি জমা দিন।" },
  { q: "প্রো কখন চালু হবে?", a: "সাধারণত কয়েক ঘণ্টার মধ্যে আমাদের টিম পেমেন্ট যাচাই করে প্রো চালু করে দেয়।" },
  { q: "মেয়াদ কতদিন?", a: "প্রতিটি পেমেন্টে এক মাসের জন্য প্রো প্ল্যান পাবেন।" },
  { q: "টাকা ফেরত পাওয়া যাবে?", a: "প্রথম ৭ দিনের মধ্যে সমস্যা হলে সাপোর্টে যোগাযোগ করুন।" },
];

function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative isolate overflow-hidden px-4 py-16">
        <Orbs />
        <h1 className="text-center text-4xl font-bold md:text-5xl">
          আপনার জন্য <span className="text-brand">সঠিক প্ল্যান</span>
        </h1>
        <p className="mx-auto mb-12 mt-4 max-w-xl text-center text-muted-foreground">ফ্রি দিয়ে শুরু করুন। বেশি দরকার হলে যেকোনো সময় প্রো নিন।</p>
        <PricingCards />
      </section>
      <section className="px-4 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">পেমেন্ট নিয়ে প্রশ্ন</h2>
        <Faq items={billingFaq} />
      </section>
      <SiteFooter />
    </div>
  );
}
