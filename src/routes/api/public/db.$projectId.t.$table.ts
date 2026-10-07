import { createFileRoute } from "@tanstack/react-router";

async function ctx(projectId: string, table: string, request: Request) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const b = await import("@/lib/backend.server");
  if (!/^[0-9a-f-]{36}$/.test(projectId) || !b.NAME_RE.test(table)) return { err: b.cjson(400, { error: "ভুল অনুরোধ" }) } as const;
  const [{ data: p }, { data: t }] = await Promise.all([
    db.from("projects").select("id, backend_enabled").eq("id", projectId).maybeSingle(),
    db.from("backend_tables").select("schema_json").eq("project_id", projectId).eq("table_name", table).maybeSingle(),
  ]);
  if (!p?.backend_enabled || !t) return { err: b.cjson(404, { error: "টেবিল পাওয়া যায়নি" }) } as const;
  const uid = await b.verifySiteToken(db, projectId, request.headers.get("authorization"));
  return { db, b, schema: (t.schema_json ?? {}) as any, uid } as const;
}

export const Route = createFileRoute("/api/public/db/$projectId/t/$table")({
  server: {
    handlers: {
      OPTIONS: async () => { const { CORS } = await import("@/lib/backend.server"); return new Response(null, { status: 204, headers: CORS }); },
      GET: async ({ params, request }) => {
        const c = await ctx(params.projectId, params.table, request);
        if ("err" in c) return c.err;
        if (c.schema.private && !c.uid) return c.b.cjson(401, { error: "আগে লগইন করুন" });
        let q = c.db.from("backend_rows").select("id, data, created_at").eq("project_id", params.projectId).eq("table_name", params.table).order("created_at", { ascending: false }).limit(500);
        if (c.schema.private) q = q.eq("owner_id", c.uid!);
        const { data } = await q;
        return c.b.cjson(200, { rows: (data ?? []).map((r: any) => ({ ...r.data, id: r.id, created_at: r.created_at })) });
      },
      POST: async ({ params, request }) => {
        const c = await ctx(params.projectId, params.table, request);
        if ("err" in c) return c.err;
        if (c.schema.private && !c.uid) return c.b.cjson(401, { error: "আগে লগইন করুন" });
        const raw = await request.text();
        if (raw.length > 10_000) return c.b.cjson(413, { error: "ডেটা খুব বড়" });
        let body: any;
        try { body = JSON.parse(raw); } catch { return c.b.cjson(400, { error: "ভুল ডেটা" }); }
        const cols: string[] = (c.schema.columns ?? []).map((x: any) => x.name);
        const data: Record<string, unknown> = {};
        for (const k of cols) if (body?.[k] !== undefined) data[k] = typeof body[k] === "string" ? body[k].slice(0, 5000) : body[k];
        const { maxRows } = await c.b.backendLimits(c.db);
        const { count } = await c.db.from("backend_rows").select("id", { count: "exact", head: true }).eq("project_id", params.projectId).eq("table_name", params.table);
        if ((count ?? 0) >= maxRows) return c.b.cjson(429, { error: "এই টেবিলের সীমা পূর্ণ হয়ে গেছে" });
        const { data: row, error } = await c.db.from("backend_rows").insert({ project_id: params.projectId, table_name: params.table, data, owner_id: c.uid } as any).select("id, data, created_at").single();
        if (error || !row) return c.b.cjson(500, { error: "সেভ করা যায়নি" });
        return c.b.cjson(200, { row: { ...(row as any).data, id: row.id, created_at: row.created_at } });
      },
      DELETE: async ({ params, request }) => {
        const c = await ctx(params.projectId, params.table, request);
        if ("err" in c) return c.err;
        if (!c.uid) return c.b.cjson(401, { error: "আগে লগইন করুন" });
        const id = new URL(request.url).searchParams.get("id") ?? "";
        await c.db.from("backend_rows").delete().eq("id", id).eq("project_id", params.projectId).eq("table_name", params.table).eq("owner_id", c.uid);
        return c.b.cjson(200, { ok: true });
      },
    },
  },
});
