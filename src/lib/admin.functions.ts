import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function adminDb(context: { supabase: any; userId: string }) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const mask = (k: string) => (k.length <= 8 ? "••••" : k.slice(0, 4) + "••••••" + k.slice(-4));

export const adminListProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context);
    const { data } = await db.from("ai_providers").select("*").order("is_default", { ascending: false }).order("sort_order").order("created_at");
    return (data ?? []).map((p) => ({ ...p, api_key: mask(p.api_key) }));
  });

const ProviderInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  base_url: z.string().url().max(300),
  api_key: z.string().max(500).optional(),
  model: z.string().min(1).max(200),
  custom_headers: z.record(z.string()).default({}),
  max_tokens: z.number().int().min(100).max(200000),
  temperature: z.number().min(0).max(2),
  is_active: z.boolean(),
  sort_order: z.number().int().default(0),
});

export const adminSaveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof ProviderInput>) => ProviderInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { id, api_key, ...rest } = data;
    if (id) {
      const patch: any = { ...rest };
      if (api_key) patch.api_key = api_key;
      const { error } = await db.from("ai_providers").update(patch).eq("id", id);
      if (error) return { error: "সেভ করা যায়নি" };
    } else {
      if (!api_key) return { error: "API Key দিন" };
      const { count } = await db.from("ai_providers").select("id", { count: "exact", head: true });
      const { error } = await db.from("ai_providers").insert({ ...rest, api_key, is_default: (count ?? 0) === 0 });
      if (error) return { error: "সেভ করা যায়নি" };
    }
    return { ok: true };
  });

export const adminDeleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    await db.from("ai_providers").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminSetDefaultProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    await db.from("ai_providers").update({ is_default: false }).neq("id", data.id);
    await db.from("ai_providers").update({ is_default: true, is_active: true }).eq("id", data.id);
    return { ok: true };
  });

export const adminTestProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { data: p } = await db.from("ai_providers").select("*").eq("id", data.id).single();
    if (!p) return { ok: false, message: "Provider পাওয়া যায়নি", ms: 0 };
    const t0 = Date.now();
    try {
      const r = await fetch(p.base_url.replace(/\/+$/, "") + "/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${p.api_key}`, "Content-Type": "application/json", ...((p.custom_headers as Record<string, string>) ?? {}) },
        body: JSON.stringify({ model: p.model, messages: [{ role: "user", content: "Hello" }], max_tokens: 20 }),
      });
      const ms = Date.now() - t0;
      const text = await r.text();
      if (!r.ok) return { ok: false, message: `ত্রুটি ${r.status}: ${text.slice(0, 200)}`, ms };
      let reply = "";
      try {
        reply = JSON.parse(text).choices?.[0]?.message?.content ?? "";
      } catch { /* ignore */ }
      return { ok: true, message: reply ? `উত্তর: ${reply.slice(0, 80)}` : "সংযোগ সফল", ms };
    } catch (e) {
      return { ok: false, message: "সংযোগ করা যায়নি: " + String(e).slice(0, 150), ms: Date.now() - t0 };
    }
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    if (data.id === context.userId) return { error: "নিজেকে ডিলিট করা যাবে না" };
    const { error } = await db.auth.admin.deleteUser(data.id);
    if (error) return { error: "ডিলিট করা যায়নি" };
    return { ok: true };
  });

export const adminResetUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
    await db.from("profiles").update({ tokens_used_today: 0, last_reset_date: today }).gte("tokens_used_today", 0);
    return { ok: true };
  });

export const adminDecidePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean }) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { data: req } = await db.from("payment_requests").select("*").eq("id", data.id).single();
    if (!req || req.status !== "pending") return { error: "অনুরোধটি পাওয়া যায়নি" };
    await db.from("payment_requests").update({ status: data.approve ? "approved" : "rejected" }).eq("id", data.id);
    if (data.approve) await db.from("profiles").update({ plan_id: req.plan_id }).eq("id", req.user_id);
    return { ok: true };
  });

export const adminGetAuraKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db: any = await adminDb(context);
    const { data } = await db.from("app_secrets").select("value").eq("name", "aurapay_api_key").maybeSingle();
    return { masked: data?.value ? mask(data.value) : "" };
  });

export const adminSetAuraKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => z.object({ key: z.string().trim().min(8).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const db: any = await adminDb(context);
    const { error } = await db.from("app_secrets").upsert({ name: "aurapay_api_key", value: data.key, updated_at: new Date().toISOString() });
    if (error) return { error: "সেভ করা যায়নি" };
    return { ok: true };
  });

export const adminGetDeployToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db: any = await adminDb(context);
    const { data } = await db.from("app_secrets").select("value").eq("name", "deploy_token").maybeSingle();
    return { masked: data?.value ? mask(data.value) : "" };
  });

/** Generates a fresh random deploy token, saves it, and returns it once so the admin can paste it into the VPS install command. */
export const adminNewDeployToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db: any = await adminDb(context);
    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(32).toString("hex");
    const { error } = await db.from("app_secrets").upsert({ name: "deploy_token", value: token, updated_at: new Date().toISOString() });
    if (error) return { error: "সেভ করা যায়নি" };
    return { ok: true as const, token };
  });

export const adminTestAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db: any = await adminDb(context);
    const { getAgent } = await import("./deploy.server");
    const agent = await getAgent(db);
    if (!agent) return { error: "সার্ভার ঠিকানা বা টোকেন দেওয়া হয়নি" };
    try {
      const r = await fetch(agent.url + "/health", { signal: AbortSignal.timeout(10000) });
      return r.ok ? { ok: true as const } : { error: `সার্ভার সাড়া দিয়েছে কিন্তু সমস্যা (${r.status})` };
    } catch {
      return { error: "সার্ভারে সংযোগ হয়নি — ঠিকানা, পোর্ট ও SSL যাচাই করুন" };
    }
  });
