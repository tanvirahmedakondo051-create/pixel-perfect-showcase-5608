import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  action: z.enum(["signup", "login"]),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(200),
  name: z.string().trim().max(100).optional(),
});

export const Route = createFileRoute("/api/public/db/$projectId/auth")({
  server: {
    handlers: {
      OPTIONS: async () => { const { CORS } = await import("@/lib/backend.server"); return new Response(null, { status: 204, headers: CORS }); },
      POST: async ({ params, request }) => {
        const b = await import("@/lib/backend.server");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        let body: z.infer<typeof Body>;
        try { body = Body.parse(await request.json()); } catch { return b.cjson(400, { error: "সঠিক ইমেইল ও কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন" }); }
        if (!/^[0-9a-f-]{36}$/.test(params.projectId)) return b.cjson(400, { error: "ভুল অনুরোধ" });
        const { data: p } = await db.from("projects").select("backend_enabled").eq("id", params.projectId).maybeSingle();
        if (!p?.backend_enabled) return b.cjson(404, { error: "ব্যাকএন্ড চালু নেই" });
        let user: any;
        if (body.action === "signup") {
          const { count } = await db.from("site_users").select("id", { count: "exact", head: true }).eq("project_id", params.projectId);
          if ((count ?? 0) >= 10000) return b.cjson(429, { error: "সাইন আপের সীমা পূর্ণ" });
          const { data, error } = await db.from("site_users").insert({ project_id: params.projectId, email: body.email, name: body.name ?? "", password_hash: b.hashPassword(body.password) }).select("id, email, name").single();
          if (error) return b.cjson(409, { error: "এই ইমেইলে আগেই অ্যাকাউন্ট আছে" });
          user = data;
        } else {
          const { data } = await db.from("site_users").select("id, email, name, password_hash").eq("project_id", params.projectId).eq("email", body.email).maybeSingle();
          if (!data || !b.checkPassword(body.password, data.password_hash)) return b.cjson(401, { error: "ইমেইল বা পাসওয়ার্ড ভুল" });
          user = { id: data.id, email: data.email, name: data.name };
        }
        return b.cjson(200, { user, token: await b.signSiteToken(db, params.projectId, user.id) });
      },
    },
  },
});
