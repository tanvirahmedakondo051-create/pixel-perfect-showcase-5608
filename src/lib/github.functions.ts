import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RECONNECT = "GitHub সংযোগ নবায়ন করতে হবে। আবার সংযোগ দিন।";

async function failMsg(res: Response, fallback: string) {
  const { appUserReconnectRequired } = await import("@/integrations/lovable/appUserConnector");
  if (await appUserReconnectRequired(res)) return RECONNECT;
  const t = await res.text();
  console.error("github", res.status, t.slice(0, 300));
  if (res.status === 403 && /rate limit/i.test(t)) return "GitHub এর সীমা শেষ, কিছুক্ষণ পর চেষ্টা করুন";
  if (res.status === 422 && /already exists/i.test(t)) return "এই নামে রিপো আগে থেকেই আছে";
  return fallback;
}

export const githubStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { adminDb } = await import("./github.server");
    const db = await adminDb();
    const { data } = await db.from("github_connections").select("github_username, avatar_url").eq("user_id", context.userId).maybeSingle();
    return data ? { connected: true as const, username: data.github_username, avatar: data.avatar_url } : { connected: false as const };
  });

export const startGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env['GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!clientKey) throw new Error("GitHub সংযোগ এখনো সেটআপ হয়নি");
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY, GITHUB_SCOPES, getConn } = await import("./github.server");
    const request = getRequest();
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL("/oauth/github/return", sandboxHost ? `https://${sandboxHost}` : url.origin).toString();
    const existing = await getConn(context.userId).catch(() => null);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY, connectorId: "github", appUserId: context.userId, clientAPIKey: clientKey, returnUrl,
      connectionAPIKey: existing?.key, credentialsConfiguration: { scopes: GITHUB_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGithubConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY, encrypt, adminDb, gh } = await import("./github.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY, data.code);
    if (connectorId !== "github") throw new Error("ভুল সংযোগ");
    let username = "", avatar = "";
    const r = await gh(connectionAPIKey, "/user");
    if (r.ok) { const u: any = await r.json(); username = u.login ?? ""; avatar = u.avatar_url ?? ""; }
    const db = await adminDb();
    const { error } = await db.from("github_connections").upsert(
      { user_id: context.userId, github_username: username, avatar_url: avatar, access_token_encrypted: encrypt(connectionAPIKey) },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true, username };
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY, getConn, adminDb } = await import("./github.server");
    const c = await getConn(context.userId).catch(() => null);
    if (c) await disconnectAppUser({ gatewayBaseUrl: GATEWAY, connectionAPIKey: c.key, connectorId: "github" }).catch((e) => console.error(e));
    await (await adminDb()).from("github_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const listGithubRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConn, gh } = await import("./github.server");
    const c = await getConn(context.userId);
    if (!c) return { error: "আগে GitHub সংযোগ দিন" };
    const r = await gh(c.key, "/user/repos?per_page=50&sort=updated&affiliation=owner");
    if (!r.ok) return { error: await failMsg(r, "রিপো তালিকা আনা যায়নি") };
    const list: any[] = await r.json();
    return { repos: list.map((x) => ({ full_name: x.full_name as string, private: !!x.private, branch: x.default_branch as string })) };
  });

async function ownProject(supabase: any, userId: string, id: string) {
  const { data } = await supabase.from("projects").select("id, user_id, name, code_html, github_repo").eq("id", id).single();
  return data && data.user_id === userId ? data : null;
}

export const pushToGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; repo: string; isPrivate: boolean; message: string }) =>
    z.object({ projectId: z.string().uuid(), repo: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/), isPrivate: z.boolean(), message: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await ownProject(context.supabase, context.userId, data.projectId);
    if (!p) return { error: "প্রজেক্ট পাওয়া যায়নি" };
    if (!p.code_html) return { error: "আগে একটি ওয়েবসাইট বানান" };
    const { getConn, gh, b64, adminDb } = await import("./github.server");
    const c = await getConn(context.userId);
    if (!c) return { error: "আগে GitHub সংযোগ দিন" };
    const full = `${c.github_username}/${data.repo}`;
    let exists = await gh(c.key, `/repos/${full}`);
    if (exists.status === 404) {
      const cr = await gh(c.key, "/user/repos", { method: "POST", body: JSON.stringify({ name: data.repo, private: data.isPrivate, auto_init: false, description: `${p.name} — Hexa AI দিয়ে তৈরি` }) });
      if (!cr.ok) return { error: await failMsg(cr, "রিপো তৈরি করা যায়নি") };
    } else if (!exists.ok) return { error: await failMsg(exists, "রিপো খোঁজা যায়নি") };
    let sha: string | undefined;
    const cur = await gh(c.key, `/repos/${full}/contents/index.html`);
    if (cur.ok) sha = ((await cur.json()) as any).sha;
    const put = await gh(c.key, `/repos/${full}/contents/index.html`, { method: "PUT", body: JSON.stringify({ message: data.message, content: b64(p.code_html), ...(sha ? { sha } : {}) }) });
    if (!put.ok) return { error: await failMsg(put, "ফাইল আপলোড করা যায়নি") };
    await (await adminDb()).from("projects").update({ github_repo: full }).eq("id", p.id);
    return { ok: true as const, url: `https://github.com/${full}`, repo: full };
  });

function parseRepo(input: string) {
  const m = input.trim().match(/(?:github\.com\/)?([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:\/|$)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export const importFromGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; repo: string }) => z.object({ projectId: z.string().uuid(), repo: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await ownProject(context.supabase, context.userId, data.projectId);
    if (!p) return { error: "প্রজেক্ট পাওয়া যায়নি" };
    const full = parseRepo(data.repo);
    if (!full) return { error: "সঠিক GitHub লিংক দিন, যেমন github.com/user/repo" };
    const { getConn, gh, unb64 } = await import("./github.server");
    const c = await getConn(context.userId).catch(() => null);
    let html: string | null = null;
    if (c) {
      const r = await gh(c.key, `/repos/${full}/contents/index.html`);
      if (r.ok) html = unb64(((await r.json()) as any).content ?? "");
    }
    if (!html) {
      const r = await fetch(`https://api.github.com/repos/${full}/contents/index.html`, { headers: { Accept: "application/vnd.github.raw", "User-Agent": "HexaAI" } });
      if (r.ok) html = await r.text();
    }
    if (!html || !/<\w+/.test(html)) return { error: "রিপোতে index.html পাওয়া যায়নি" };
    if (html.length > 1_000_000) return { error: "ফাইলটি অনেক বড়" };
    const now = new Date().toISOString();
    const { data: proj } = await context.supabase.from("projects").select("messages").eq("id", p.id).single();
    const msgs = [...((proj?.messages as any[]) ?? []), { role: "assistant", content: `✓ GitHub (${full}) থেকে ইমপোর্ট হয়েছে`, at: now, mode: "build" }];
    const { error } = await context.supabase.from("projects").update({ code_html: html, messages: msgs }).eq("id", p.id);
    if (error) return { error: "সেভ করা যায়নি" };
    return { ok: true as const, html };
  });

export const listGithubCommits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await ownProject(context.supabase, context.userId, data.projectId);
    if (!p?.github_repo) return { repo: null, commits: [] };
    const { getConn, gh } = await import("./github.server");
    const c = await getConn(context.userId);
    if (!c) return { repo: p.github_repo, commits: [], error: "আগে GitHub সংযোগ দিন" };
    const r = await gh(c.key, `/repos/${p.github_repo}/commits?per_page=20`);
    if (!r.ok) return { repo: p.github_repo, commits: [], error: await failMsg(r, "কমিট আনা যায়নি") };
    const list: any[] = await r.json();
    return { repo: p.github_repo as string, commits: list.map((x) => ({ sha: (x.sha as string).slice(0, 7), message: x.commit?.message as string, date: x.commit?.author?.date as string, url: x.html_url as string })) };
  });
