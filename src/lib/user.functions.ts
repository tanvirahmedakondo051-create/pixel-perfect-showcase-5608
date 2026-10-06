import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listActiveProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { effectivePlan, allowedProviders } = await import("./plan.server");
    const prof = await effectivePlan(supabaseAdmin, context.userId);
    const list = await allowedProviders(supabaseAdmin, prof?.plans);
    return list.map((p: any) => ({ id: p.id as string, name: p.name as string, model: p.model as string, is_default: p.is_default as boolean }));
  });

async function planFor(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("is_banned, plans(*)").eq("id", userId).single();
  return data as { is_banned: boolean; plans: { max_projects: number; show_badge: boolean; price_bdt: number; can_publish: boolean } | null } | null;
}

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name?: string; copyFrom?: string }) => z.object({ name: z.string().max(120).optional(), copyFrom: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prof = await planFor(supabase, userId);
    if (prof?.is_banned) return { error: "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে" };
    const max = prof?.plans?.max_projects ?? 3;
    if (max >= 0) {
      const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if ((count ?? 0) >= max) return { error: `আপনার প্ল্যানে সর্বোচ্চ ${max}টি প্রজেক্ট রাখা যায়। Pro নিন বা পুরনো প্রজেক্ট ডিলিট করুন।` };
    }
    let row: { name: string; code_html: string; messages: any } = { name: data.name || "নতুন প্রজেক্ট", code_html: "", messages: [] };
    if (data.copyFrom) {
      const { data: src } = await supabase.from("projects").select("name, code_html, messages").eq("id", data.copyFrom).single();
      if (src) row = { name: src.name + " (কপি)", code_html: src.code_html, messages: src.messages };
    }
    const { data: p, error } = await supabase.from("projects").insert({ ...row, user_id: userId }).select("id").single();
    if (error) return { error: "প্রজেক্ট তৈরি করা যায়নি" };
    return { id: p.id };
  });

function slug(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return (base || "site") + "-" + Math.random().toString(36).slice(2, 7);
}

export const setPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; publish: boolean }) => z.object({ id: z.string().uuid(), publish: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj } = await supabase.from("projects").select("id, name, user_id, subdomain, is_flagged, code_html").eq("id", data.id).single();
    if (!proj || proj.user_id !== userId) return { error: "প্রজেক্ট পাওয়া যায়নি" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.publish) {
      await supabaseAdmin.from("projects").update({ is_published: false }).eq("id", data.id);
      return { ok: true as const, subdomain: proj.subdomain };
    }
    if (!proj.code_html) return { error: "আগে একটি ওয়েবসাইট বানান, তারপর প্রকাশ করুন" };
    if (proj.is_flagged) return { error: "এই প্রজেক্টটি পর্যালোচনার অপেক্ষায় আছে, এখন প্রকাশ করা যাবে না" };
    const prof = await planFor(supabase, userId);
    if (prof?.is_banned) return { error: "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে" };
    if (prof?.plans && prof.plans.can_publish === false) return { error: "আপনার প্ল্যানে প্রকাশ করার সুবিধা নেই। আপগ্রেড করুন।" };
    const { data: settings } = await supabase.from("site_settings").select("free_block_publish").eq("id", 1).single();
    if (settings?.free_block_publish && (prof?.plans?.price_bdt ?? 0) === 0) return { error: "ফ্রি প্ল্যানে প্রকাশ বন্ধ আছে। প্রকাশ করতে Pro নিন।" };
    const subdomain = proj.subdomain ?? slug(proj.name);
    const { error } = await supabaseAdmin.from("projects").update({ is_published: true, subdomain, show_badge: prof?.plans?.show_badge ?? true }).eq("id", data.id);
    if (error) return { error: "প্রকাশ করা যায়নি" };
    return { ok: true as const, subdomain };
  });
