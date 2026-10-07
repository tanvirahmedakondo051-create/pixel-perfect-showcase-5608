import { createFileRoute } from "@tanstack/react-router";

const page = (msg: string, status = 400) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;background:#0f0a1e;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0"><p>${msg}</p></body>`, { status, headers: { "content-type": "text/html; charset=utf-8" } });

export const Route = createFileRoute("/api/public/db/$projectId/google")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!/^[0-9a-f-]{36}$/.test(params.projectId)) return page("ভুল অনুরোধ");
        const clientId = process.env.SITE_GOOGLE_CLIENT_ID;
        if (!clientId || !process.env.SITE_GOOGLE_CLIENT_SECRET) return page("Google লগইন এখনো চালু হয়নি", 503);
        const ret = new URL(request.url).searchParams.get("return") ?? "";
        let r: URL;
        try { r = new URL(ret); } catch { return page("ভুল ফেরত ঠিকানা"); }
        if (!/^https?:$/.test(r.protocol)) return page("ভুল ফেরত ঠিকানা");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: p } = await db.from("projects").select("backend_enabled, subdomain, custom_domain").eq("id", params.projectId).maybeSingle();
        if (!p?.backend_enabled) return page("ব্যাকএন্ড চালু নেই", 404);
        const { appOrigin } = await import("@/lib/origin.server");
        const origin = appOrigin();
        const host = r.hostname.toLowerCase();
        const cd = (p.custom_domain ?? "").toLowerCase();
        const ok = host === new URL(origin).hostname || host === "localhost" ||
          (!!cd && (host === cd || host === `www.${cd}`)) ||
          (!!p.subdomain && host.split(".")[0] === String(p.subdomain).toLowerCase());
        if (!ok) return page("এই সাইট থেকে Google লগইন অনুমোদিত নয়", 403);
        const { signState } = await import("@/lib/backend.server");
        const state = await signState(db, { p: params.projectId, r: r.toString() });
        const g = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        g.search = new URLSearchParams({ client_id: clientId, redirect_uri: `${origin}/api/public/site-oauth/google/callback`, response_type: "code", scope: "openid email profile", state, prompt: "select_account" }).toString();
        return Response.redirect(g.toString(), 302);
      },
    },
  },
});
