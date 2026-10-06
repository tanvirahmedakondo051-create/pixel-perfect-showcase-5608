import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { usePlans } from "@/lib/site";
import { bn, useSession } from "@/lib/auth";
import { PaymentDialog } from "./PaymentDialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function PricingCards() {
  const { data: plans } = usePlans();
  const { user } = useSession();
  const [buy, setBuy] = useState<{ id: string; name: string; price: number } | null>(null);
  if (!plans) return <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="glass h-96 animate-pulse rounded-2xl" />)}</div>;
  return (
    <>
      <div className={`grid gap-4 ${plans.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"} mx-auto max-w-4xl`}>
        {plans.map((p) => {
          const featured = p.price_bdt > 0;
          return (
            <div key={p.id} className={`relative rounded-2xl p-6 ${featured ? "border border-primary/60 bg-gradient-to-b from-primary/20 to-card shadow-glow" : "glass"}`}>
              {featured && <span className="absolute right-4 top-4 rounded-full bg-brand px-3 py-1 text-xs font-semibold">জনপ্রিয়</span>}
              <h3 className="text-xl font-bold">{p.name_bn}</h3>
              <p className="mt-3">
                <span className="text-4xl font-bold">৳{bn(p.price_bdt)}</span>
                <span className="text-muted-foreground"> / মাস</span>
              </p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="size-5 shrink-0 text-cyan" /> {f}
                  </li>
                ))}
              </ul>
              {p.price_bdt === 0 ? (
                <Link to={user ? "/dashboard" : "/signup"} className="mt-8 flex min-h-12 items-center justify-center rounded-xl border border-input font-semibold">
                  ফ্রি শুরু করুন
                </Link>
              ) : user ? (
                <button onClick={() => setBuy({ id: p.id, name: p.name_bn, price: p.price_bdt })} className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand font-semibold">
                  {p.name_bn} নিন
                </button>
              ) : (
                <Link to="/signup" className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold">
                  {p.name_bn} নিন
                </Link>
              )}
            </div>
          );
        })}
      </div>
      {buy && <PaymentDialog plan={buy} onClose={() => setBuy(null)} />}
    </>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible className="mx-auto max-w-3xl">
      {items.map((it, i) => (
        <AccordionItem key={i} value={String(i)} className="border-border">
          <AccordionTrigger className="min-h-12 text-left text-base">{it.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
