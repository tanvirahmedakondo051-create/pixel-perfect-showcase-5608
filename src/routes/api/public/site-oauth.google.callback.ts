import { createFileRoute } from "@tanstack/react-router";

const back = (ret: string, hash: Record<string, string>) =>
  Response.redirect(`${ret.split("#")[0]}#${new URLSearchParams(hash).toString()}`, 302);

export const Route = createFileRoute("/api/public/site-oauth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const b = await import("@/lib/backend.server");
        const st = await b.verifyState(db, u.searchParams.get("state") ?? "");
        if (!st) return new Response("লগইনের সময় শেষ, আবার চেষ্টা করুন", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
        const code = u.searchParams.get("code");
        if (!code) return back(st.r, { hexa_error: "Google লগইন বাতিল হয়েছে" });
        const { appOrigin } = await import("@/lib/origin.server");
        try {
          const tr = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ code, client_id: process.env.SITE_GOOGLE_CLIENT_ID!, client_secret: process.env.SITE_GOOGLE_CLIENT_SECRET!, redirect_uri: `${appOrigin()}/api/public/site-oauth/google/callback`, grant_type: "authorization_code" }),
          });
          const tj: any = await tr.json();
          if (!tr.ok || !tj.access_token) throw new Error("token " + JSON.stringify(tj).slice(0, 200));
          const ir = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tj.access_token}` } });
          const info: any = await ir.json();
          if (!info.email || !info.email_verified) return back(st.r, { hexa_error: "Google ইমেইল যাচাই করা নেই" });
          const email = String(info.email).toLowerCase();
          const { data: p } = await db.from("projects").select("backend_enabled").eq("id", st.p).maybeSingle();
          if (!p?.backend_enabled) return back(st.r, { hexa_error: "ব্যাকএন্ড চালু নেই" });
          let { data: user } = await db.from("site_users").select("id, email, name, avatar_url").eq("project_id", st.p).eq("email", email).maybeSingle();
          if (!user) {
            const { count } = await db.from("site_users").select("id", { count: "exact", head: true }).eq("project_id", st.p);
            if ((count ?? 0) >= 10000) return back(st.r, { hexa_error: "সাইন আপের সীমা পূর্ণ" });
            const { data, error } = await db.from("site_users").insert({ project_id: st.p, email, name: String(info.name ?? "").slice(0, 100), avatar_url: String(info.picture ?? ""), provider: "google", password_hash: "" }).select("id, email, name, avatar_url").single();
            if (error || !data) throw error ?? new Error("insert");
            user = data;
          } else if (!user.avatar_url && info.picture) {
            await db.from("site_users").update({ avatar_url: String(info.picture) }).eq("id", user.id);
            user.avatar_url = String(info.picture);
          }
          const pub = { id: user.id, email: user.email, name: user.name, avatar: user.avatar_url };
          const token = await b.signSiteToken(db, st.p, user.id);
          return back(st.r, { hexa_token: token, hexa_user: Buffer.from(JSON.stringify(pub)).toString("base64url") });
        } catch (e) {
          console.error("[site-oauth] google failed", e);
          return back(st.r, { hexa_error: "Google লগইন ব্যর্থ হয়েছে" });
        }
      },
    },
  },
});
