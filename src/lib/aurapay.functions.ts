import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createAuraPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { auraCreate } = await import("./plan.server");
    const [{ data: plan }, { data: prof }, { data: s }] = await Promise.all([
      db.from("plans").select("id, price_bdt, name_en").eq("id", data.planId).single(),
      db.from("profiles").select("name, email, is_banned").eq("id", context.userId).single(),
      db.from("site_settings").select("aurapay_enabled").eq("id", 1).single(),
    ]);
    if (!plan || plan.price_bdt <= 0) return { error: "প্ল্যান পাওয়া যায়নি" };
    if (prof?.is_banned) return { error: "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে" };
    if (s && !(s as any).aurapay_enabled) return { error: "এই মুহূর্তে পেমেন্ট বন্ধ আছে" };
    const origin = new URL(getRequest().url).origin;
    const { data: row, error } = await db.from("aura_payments").insert({ user_id: context.userId, plan_id: plan.id, amount: plan.price_bdt }).select("id").single();
    if (error || !row) return { error: "পেমেন্ট শুরু করা যায়নি" };
    const r = await auraCreate({
      full_name: prof?.name || "Hexa AI User",
      email: prof?.email || "user@hexa.ai",
      amount: String(plan.price_bdt),
      metadata: { payment_id: row.id, user_id: context.userId, plan_id: plan.id },
      redirect_url: `${origin}/payment/success`,
      return_type: "GET",
      cancel_url: `${origin}/pricing`,
      webhook_url: `${origin}/api/public/aurapay-webhook`,
    });
    if ("error" in r) {
      await db.from("aura_payments").update({ status: "failed", raw: ("detail" in r ? r.detail : {}) as any }).eq("id", row.id);
      return { error: r.error as string };
    }
    if (r.invoice) await db.from("aura_payments").update({ invoice_id: r.invoice }).eq("id", row.id);
    return { url: r.url };
  });

export const verifyAuraPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { invoiceId: string }) => z.object({ invoiceId: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { auraVerifyAndApply } = await import("./plan.server");
    return (await auraVerifyAndApply(db, data.invoiceId)) as { ok?: boolean; error?: string };
  });
