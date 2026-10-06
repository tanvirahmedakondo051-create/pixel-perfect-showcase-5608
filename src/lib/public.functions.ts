import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hostingStatus, type HostingStatus } from "./hosting";

export const getPublishedSite = createServerFn({ method: "GET" })
  .inputValidator((d: { subdomain: string }) => z.object({ subdomain: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: p } = await db
      .from("projects")
      .select("name, code_html, show_badge, user_id")
      .eq("subdomain", data.subdomain)
      .eq("is_published", true)
      .maybeSingle();
    if (!p) return null;
    const [{ data: prof }, { data: def }, { data: s }] = await Promise.all([
      db.from("profiles").select("plan_expires_at, plan_ended_at, plans(price_bdt, can_publish)").eq("id", p.user_id).maybeSingle(),
      db.from("plans").select("price_bdt, can_publish").eq("is_default", true).order("created_at").limit(1).maybeSingle(),
      db.from("site_settings").select("free_block_publish").eq("id", 1).maybeSingle(),
    ]);
    const pr: any = prof;
    const expired = pr?.plan_expires_at && new Date(pr.plan_expires_at) < new Date();
    const fallback: any = expired ? def : (pr?.plans ?? def);
    const fallbackCanHost = !!fallback && fallback.can_publish !== false && !(s?.free_block_publish && (fallback.price_bdt ?? 0) === 0);
    const status: HostingStatus = hostingStatus({ planExpiresAt: pr?.plan_expires_at ?? null, planEndedAt: pr?.plan_ended_at ?? null, fallbackCanHost });
    return { name: p.name, code_html: status.state === "offline" ? "" : p.code_html, show_badge: p.show_badge, status };
  });
