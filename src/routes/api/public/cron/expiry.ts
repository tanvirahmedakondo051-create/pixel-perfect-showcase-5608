import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Daily: expire plans, push notice/offline pages to the VPS, and permanently delete sites after the configured days.
export const Route = createFileRoute("/api/public/cron/expiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { effectivePlan } = await import("@/lib/plan.server");
        const { hostingStatus } = await import("@/lib/hosting");
        const { deployProject, removeDomains, getAgent, siteDomains } = await import("@/lib/deploy.server");
        const origin = new URL(request.url).origin;

        // 1. Move expired paid plans to the free plan (sets plan_ended_at).
        const { data: expiring } = await db.from("profiles").select("id").lt("plan_expires_at", new Date().toISOString()).limit(500);
        for (const p of expiring ?? []) await effectivePlan(db, p.id);

        const [{ data: s }, { data: def }] = await Promise.all([
          db.from("site_settings").select("grace_days, delete_after_days, free_block_publish").eq("id", 1).single(),
          db.from("plans").select("price_bdt, can_publish").eq("is_default", true).order("created_at").limit(1).maybeSingle(),
        ]);
        const fallbackCanHost = !!def && def.can_publish !== false && !((s as any)?.free_block_publish && (def.price_bdt ?? 0) === 0);
        const agent = await getAgent(db);

        // 2. Users whose plan ended and whose sites are not yet deleted.
        const { data: ended } = await db.from("profiles").select("id, plan_expires_at, plan_ended_at").not("plan_ended_at", "is", null).is("sites_deleted_at", null).limit(500);
        let notice = 0, offline = 0, deleted = 0;
        for (const u of ended ?? []) {
          const st = hostingStatus({ planExpiresAt: u.plan_expires_at, planEndedAt: u.plan_ended_at, fallbackCanHost, graceDays: (s as any)?.grace_days, deleteAfterDays: (s as any)?.delete_after_days });
          if (st.state === "active") continue;
          const { data: projects } = await db.from("projects").select("id, subdomain, custom_domain, domain_status, deploy_status").eq("user_id", u.id).eq("is_published", true);
          if (st.state === "deleted") {
            for (const p of projects ?? []) {
              if (agent) await removeDomains(db, siteDomains(p, agent.hostingDomain));
              await db.from("project_versions").delete().eq("project_id", p.id);
              const { data: files } = await db.storage.from("uploads").list(p.id, { limit: 1000 });
              if (files?.length) await db.storage.from("uploads").remove(files.map((f) => `${p.id}/${f.name}`));
              await db.from("projects").update({ is_published: false, published_html: null, published_code_hash: null, published_version: 0, changes_since_publish: 0, deploy_status: "none", deploy_message: "", deployed_url: null }).eq("id", p.id);
              deleted++;
            }
            await db.from("profiles").update({ sites_deleted_at: new Date().toISOString() }).eq("id", u.id);
            continue;
          }
          const want = st.state === "grace" ? "notice" : "offline";
          for (const p of projects ?? []) {
            if (p.deploy_status === want) continue;
            const r = await deployProject(db, p.id, origin);
            if (r.ok && !r.skipped) await db.from("projects").update({ deploy_status: want }).eq("id", p.id);
            if (want === "notice") notice++; else offline++;
          }
        }
        // 3. Renewed users: bring notice/offline sites back.
        let restored = 0;
        const { data: stale } = await db.from("projects").select("id, user_id").eq("is_published", true).in("deploy_status", ["notice", "offline"]).limit(200);
        for (const p of stale ?? []) {
          const { data: prof } = await db.from("profiles").select("plan_expires_at, plan_ended_at").eq("id", p.user_id).single();
          const st = hostingStatus({ planExpiresAt: prof?.plan_expires_at ?? null, planEndedAt: prof?.plan_ended_at ?? null, fallbackCanHost, graceDays: (s as any)?.grace_days, deleteAfterDays: (s as any)?.delete_after_days });
          if (st.state === "active") { await deployProject(db, p.id, origin); restored++; }
        }
        return Response.json({ ok: true, notice, offline, deleted, restored });
      },
    },
  },
});
