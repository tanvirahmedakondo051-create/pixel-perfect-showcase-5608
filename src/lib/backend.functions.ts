import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownerDb(context: { userId: string }, projectId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: p } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!p || p.user_id !== context.userId) throw new Error("Forbidden");
  return { db, p };
}

const SCHEMA_SYS = `You design a tiny backend for a website. From the user's request, output ONLY JSON:
{"tables":[{"name":"snake_case_english","private":false,"description":"<short Bangla>","columns":[{"name":"snake_case","type":"text|number|boolean|date|json"}]}]}
Rules: max 5 tables, max 12 columns each. Do NOT include id, project_id, created_at, owner_id (automatic). Visitor accounts (login/signup) are built in — never create a users table. Set "private": true only for per-visitor data (e.g. cart, my orders). Public form submissions (contact, booking) are "private": false.`;

/** Asks the AI for a schema and creates the project's tables (1-click "Auto Setup"). */
export const setupBackend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; prompt: string }) => z.object({ projectId: z.string().uuid(), prompt: z.string().trim().min(2).max(3000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, p } = await ownerDb(context, data.projectId);
    const b = await import("@/lib/backend.server");
    const { effectivePlan, allowedProviders } = await import("@/lib/plan.server");
    const [profile, { data: settings }, { data: existing }] = await Promise.all([
      effectivePlan(db, context.userId),
      db.from("site_settings").select("tokens_per_coin").eq("id", 1).single(),
      db.from("backend_tables").select("table_name, schema_json").eq("project_id", p.id),
    ]);
    if (!profile || Number((profile as any).coins ?? 0) <= 0) return { error: "কয়েন শেষ" };
    const providers = await allowedProviders(db, profile.plans);
    if (!providers?.length) return { error: "এখনো কোনো AI সংযুক্ত নেই" };
    const ctxTables = (existing ?? []).map((t: any) => `${t.table_name}(${(t.schema_json?.columns ?? []).map((c: any) => c.name).join(",")})`).join("; ");
    let parsed: any = null; let tokens = 0;
    for (const pr of providers) {
      try {
        const r = await fetch(pr.base_url.replace(/\/+$/, "") + "/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${pr.api_key}`, "Content-Type": "application/json", ...((pr.custom_headers as Record<string, string>) ?? {}) },
          body: JSON.stringify({ model: pr.model, temperature: 0.2, max_tokens: 1500, messages: [
            { role: "system", content: SCHEMA_SYS },
            { role: "user", content: (ctxTables ? `Existing tables (do not repeat): ${ctxTables}\n\n` : "") + data.prompt },
          ] }),
          signal: AbortSignal.timeout(60000),
        });
        if (!r.ok) continue;
        const j: any = await r.json();
        const t = String(j.choices?.[0]?.message?.content ?? "");
        tokens = j.usage?.total_tokens ?? Math.ceil((SCHEMA_SYS.length + data.prompt.length + t.length) / 4);
        parsed = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
        break;
      } catch (e) { console.error("schema ai", e); }
    }
    if (!parsed?.tables?.length) return { error: "AI টেবিল ডিজাইন করতে পারেনি, আবার চেষ্টা করুন" };
    const coins = Math.round((tokens / Math.max(1, settings?.tokens_per_coin ?? 10000)) * 100) / 100;
    if (coins > 0) await db.rpc("add_coins" as any, { _user: context.userId, _amount: -coins, _type: "spend", _reason: "ব্যাকএন্ড সেটআপ" } as any);

    const { maxTables } = await b.backendLimits(db);
    const have = new Set((existing ?? []).map((t: any) => t.table_name));
    const created: string[] = [];
    for (const t of parsed.tables as any[]) {
      const name = String(t.name ?? "").toLowerCase();
      if (!b.NAME_RE.test(name) || have.has(name)) continue;
      if (have.size >= maxTables) break;
      const columns = (Array.isArray(t.columns) ? t.columns : []).slice(0, 12)
        .map((c: any) => ({ name: String(c.name ?? "").toLowerCase(), type: ["text", "number", "boolean", "date", "json"].includes(c.type) ? c.type : "text" }))
        .filter((c: any) => b.NAME_RE.test(c.name) && !["id", "project_id", "created_at", "owner_id"].includes(c.name));
      if (!columns.length) continue;
      const { error } = await db.from("backend_tables").insert({ project_id: p.id, table_name: name, schema_json: { columns, private: !!t.private, description: String(t.description ?? "").slice(0, 200) } });
      if (!error) { have.add(name); created.push(name); }
    }
    const upd: any = { backend_enabled: true };
    if (p.code_html) { const { appOrigin } = await import("@/lib/origin.server"); upd.code_html = b.injectBackend(p.code_html, appOrigin(), p.id); }
    await db.from("projects").update(upd).eq("id", p.id);
    return { ok: true, created, coins, limitHit: have.size >= maxTables && created.length < parsed.tables.length };
  });

export const listBackend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, p } = await ownerDb(context, data.projectId);
    const { data: tables } = await db.from("backend_tables").select("table_name, schema_json, created_at").eq("project_id", p.id).order("created_at");
    const counts = await Promise.all((tables ?? []).map((t) => db.from("backend_rows").select("id", { count: "exact", head: true }).eq("project_id", p.id).eq("table_name", t.table_name)));
    const { count: users } = await db.from("site_users").select("id", { count: "exact", head: true }).eq("project_id", p.id);
    const b = await import("@/lib/backend.server");
    return { enabled: p.backend_enabled, users: users ?? 0, limits: await b.backendLimits(db), tables: (tables ?? []).map((t, i) => ({ name: t.table_name, schema: t.schema_json as any, rows: counts[i].count ?? 0 })) };
  });

export const backendRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; table: string; page: number }) => z.object({ projectId: z.string().uuid(), table: z.string().max(40), page: z.number().int().min(0).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, p } = await ownerDb(context, data.projectId);
    const { data: rows } = await db.from("backend_rows").select("id, data, created_at").eq("project_id", p.id).eq("table_name", data.table).order("created_at", { ascending: false }).range(data.page * 25, data.page * 25 + 24);
    return { rows: (rows ?? []) as any[] };
  });

export const deleteBackendItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; table: string; rowId?: string }) => z.object({ projectId: z.string().uuid(), table: z.string().max(40), rowId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, p } = await ownerDb(context, data.projectId);
    if (data.rowId) await db.from("backend_rows").delete().eq("id", data.rowId).eq("project_id", p.id);
    else {
      await db.from("backend_rows").delete().eq("project_id", p.id).eq("table_name", data.table);
      await db.from("backend_tables").delete().eq("project_id", p.id).eq("table_name", data.table);
    }
    return { ok: true };
  });

export const setProjectType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; type: "html" | "react" }) => z.object({ projectId: z.string().uuid(), type: z.enum(["html", "react"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, p } = await ownerDb(context, data.projectId);
    if (p.code_html) return { error: "সাইট তৈরির পর ধরন বদলানো যায় না" };
    if (data.type === "react") {
      const { getAgent } = await import("@/lib/deploy.server");
      if (!(await getAgent(db))) return { error: "React মোডের জন্য অ্যাডমিনকে আগে VPS সার্ভার সেটআপ করতে হবে" };
    }
    await db.from("projects").update({ project_type: data.type }).eq("id", p.id);
    return { ok: true };
  });
