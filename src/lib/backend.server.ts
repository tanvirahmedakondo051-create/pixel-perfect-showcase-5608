// Server-only: per-project "virtual tables" backend used by generated sites.
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export type Col = { name: string; type: string };
export type TableSchema = { columns: Col[]; private?: boolean; description?: string };

export const NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};
export const cjson = (status: number, body: unknown) => Response.json(body, { status, headers: CORS });

async function authSecret(db: any): Promise<string> {
  const { data } = await db.from("app_secrets").select("value").eq("name", "site_auth_secret").maybeSingle();
  if (data?.value) return data.value;
  const v = randomBytes(32).toString("hex");
  await db.from("app_secrets").upsert({ name: "site_auth_secret", value: v, updated_at: new Date().toISOString() });
  return v;
}

export async function signSiteToken(db: any, projectId: string, userId: string) {
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  const body = `${projectId}.${userId}.${exp}`;
  return `${body}.${createHmac("sha256", await authSecret(db)).update(body).digest("hex")}`;
}

export async function verifySiteToken(db: any, projectId: string, header: string | null): Promise<string | null> {
  const t = header?.replace(/^Bearer\s+/i, "") ?? "";
  const parts = t.split(".");
  if (parts.length !== 4 || parts[0] !== projectId || Number(parts[2]) < Date.now() / 1000) return null;
  const exp = createHmac("sha256", await authSecret(db)).update(parts.slice(0, 3).join(".")).digest("hex");
  if (exp.length !== parts[3].length || !timingSafeEqual(Buffer.from(exp), Buffer.from(parts[3]))) return null;
  return parts[1];
}

/** Signed, short-lived OAuth state (projectId + return URL). */
export async function signState(db: any, data: { p: string; r: string }) {
  const body = Buffer.from(JSON.stringify({ ...data, n: randomBytes(8).toString("hex"), e: Date.now() + 600_000 })).toString("base64url");
  return `${body}.${createHmac("sha256", await authSecret(db)).update("oauth." + body).digest("hex")}`;
}
export async function verifyState(db: any, s: string): Promise<{ p: string; r: string } | null> {
  const [body, sig] = s.split(".");
  if (!body || !sig) return null;
  const exp = createHmac("sha256", await authSecret(db)).update("oauth." + body).digest("hex");
  if (exp.length !== sig.length || !timingSafeEqual(Buffer.from(exp), Buffer.from(sig))) return null;
  try { const j = JSON.parse(Buffer.from(body, "base64url").toString()); return j.e > Date.now() ? { p: j.p, r: j.r } : null; } catch { return null; }
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${pbkdf2Sync(pw, salt, 20000, 32, "sha256").toString("hex")}`;
}
export function checkPassword(pw: string, stored: string) {
  const [salt, h] = (stored || "").split(":");
  if (!salt || !h) return false;
  const c = pbkdf2Sync(pw, salt, 20000, 32, "sha256").toString("hex");
  return timingSafeEqual(Buffer.from(c), Buffer.from(h));
}

export async function backendLimits(db: any) {
  const { data } = await db.from("site_settings").select("backend_max_tables, backend_max_rows").eq("id", 1).single();
  return { maxTables: data?.backend_max_tables ?? 10, maxRows: data?.backend_max_rows ?? 10000 };
}

/** Text the AI gets so it writes frontend code against the real schema. */
export async function backendContext(db: any, projectId: string, react: boolean) {
  const { data } = await db.from("backend_tables").select("table_name, schema_json").eq("project_id", projectId).order("created_at");
  const tables = (data ?? []).map((t: any) => `- ${t.table_name}${t.schema_json?.private ? " (private: each signed-in visitor sees only own rows)" : ""}: ${(t.schema_json?.columns ?? []).map((c: Col) => `${c.name}:${c.type}`).join(", ")} (+ auto id, created_at)`).join("\n");
  return `\n\nBACKEND IS ENABLED. A global client \`window.hexaDB\` is auto-injected into the page at runtime (never create it yourself, never hardcode URLs or keys). API (all return Promises):
- hexaDB.list(table) -> array of rows {id, created_at, ...columns}
- hexaDB.insert(table, {col: value}) -> row
- hexaDB.remove(table, id)
- hexaDB.signup(email, password, name) / hexaDB.login(email, password) -> {user}; hexaDB.logout(); hexaDB.user() -> {id,email,name,avatar}|null
- hexaDB.loginWithGoogle() -> sends the visitor to Google and back to the same page signed in (no setup needed). On every login/sign-up form add a "Google দিয়ে লগইন" button (Iconify logos:google-icon) calling it; on load read hexaDB.user() to show the signed-in state.
- ALWAYS put a visible "লগইন" button in the nav that opens a login/sign-up form using these calls (show the user name + logout when signed in).
Errors throw Error with a Bangla message — show them to the visitor.
Tables:\n${tables || "(none yet)"}${react ? "\nIn React, declare `declare global { interface Window { hexaDB: any } }`, wrap it in hooks (useTable) and an AuthContext. Do NOT install supabase-js." : ""}`;
}

const CLIENT = (api: string) => `<script data-hexa-db>(function(){var A=${JSON.stringify(api)},K="hexa_auth",S=null;try{S=JSON.parse(localStorage.getItem(K)||"null")}catch(e){}
function save(v){S=v;try{v?localStorage.setItem(K,JSON.stringify(v)):localStorage.removeItem(K)}catch(e){}}
try{var H=location.hash;if(H.indexOf("hexa_token=")>-1){var q=new URLSearchParams(H.slice(1)),u=q.get("hexa_user"),er=q.get("hexa_error");if(q.get("hexa_token")&&u){u=JSON.parse(decodeURIComponent(escape(atob(u.replace(/-/g,"+").replace(/_/g,"/")))));save({token:q.get("hexa_token"),user:u})}history.replaceState(null,"",location.pathname+location.search)}else if(H.indexOf("hexa_error=")>-1){var e2=new URLSearchParams(H.slice(1)).get("hexa_error");history.replaceState(null,"",location.pathname+location.search);setTimeout(function(){alert(e2)},50)}}catch(e){}
function req(p,o){o=o||{};var h={"content-type":"application/json"};if(S&&S.token)h.authorization="Bearer "+S.token;return fetch(A+p,{method:o.method||"GET",headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"সমস্যা হয়েছে");return j})})}
window.hexaDB={list:function(t){return req("/t/"+t).then(function(j){return j.rows})},insert:function(t,d){return req("/t/"+t,{method:"POST",body:d}).then(function(j){return j.row})},remove:function(t,id){return req("/t/"+t+"?id="+encodeURIComponent(id),{method:"DELETE"})},
signup:function(e,p,n){return req("/auth",{method:"POST",body:{action:"signup",email:e,password:p,name:n}}).then(function(j){save(j);return j})},login:function(e,p){return req("/auth",{method:"POST",body:{action:"login",email:e,password:p}}).then(function(j){save(j);return j})},loginWithGoogle:function(){location.href=A+"/google?return="+encodeURIComponent(location.href.split("#")[0])},logout:function(){save(null)},user:function(){return S&&S.user||null}};})();</script>`;

/** Built-in login button + popup, added only when the AI forgot a login UI. */
const LOGIN_UI = `<div data-hexa-login><style>.hxl-btn{position:fixed;right:16px;bottom:16px;z-index:9998;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(15,10,30,.85);color:#fff;font:600 15px/1 inherit;backdrop-filter:blur(10px);cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}.hxl-ov{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px}.hxl-ov.on{display:flex}.hxl-box{width:100%;max-width:380px;background:#fff;color:#111;border-radius:16px;padding:24px;font-family:inherit}.hxl-box h3{margin:0 0 14px;font-size:20px}.hxl-box input{width:100%;box-sizing:border-box;min-height:44px;margin:0 0 10px;padding:0 12px;border:1px solid #ddd;border-radius:10px;font:inherit}.hxl-box button{width:100%;min-height:44px;border-radius:10px;border:0;font:600 15px inherit;cursor:pointer;margin-top:4px}.hxl-p{background:#4f46e5;color:#fff}.hxl-g{background:#f3f4f6;color:#111;display:flex;align-items:center;justify-content:center;gap:8px}.hxl-s{font-size:13px;color:#555;text-align:center;margin-top:10px;cursor:pointer}.hxl-e{color:#b91c1c;font-size:13px;min-height:18px}</style>
<button class="hxl-btn" type="button" data-hxl-open>লগইন</button><div class="hxl-ov" role="dialog" aria-modal="true" aria-label="লগইন"><form class="hxl-box"><h3 data-hxl-t>লগইন করুন</h3><input data-hxl-n placeholder="আপনার নাম" style="display:none"><input data-hxl-em type="email" placeholder="ইমেইল" required><input data-hxl-pw type="password" placeholder="পাসওয়ার্ড" required minlength="6"><div class="hxl-e" data-hxl-err></div><button class="hxl-p" type="submit" data-hxl-sub>লগইন</button><button class="hxl-g" type="button" data-hxl-g><img src="https://api.iconify.design/logos:google-icon.svg" width="18" height="18" alt="" aria-hidden="true">Google দিয়ে লগইন</button><div class="hxl-s" data-hxl-sw>অ্যাকাউন্ট নেই? সাইন আপ করুন</div></form></div>
<script>(function(){var r=document.querySelector("[data-hexa-login]"),b=r.querySelector("[data-hxl-open]"),o=r.querySelector(".hxl-ov"),f=r.querySelector("form"),up=false;function q(s){return r.querySelector(s)}function paint(){var u=window.hexaDB&&hexaDB.user();b.textContent=u?((u.name||u.email||"")+" · লগআউট"):"লগইন"}b.onclick=function(){if(hexaDB.user()){hexaDB.logout();paint();return}o.classList.add("on")};o.onclick=function(e){if(e.target===o)o.classList.remove("on")};q("[data-hxl-sw]").onclick=function(){up=!up;q("[data-hxl-n]").style.display=up?"":"none";q("[data-hxl-t]").textContent=up?"সাইন আপ করুন":"লগইন করুন";q("[data-hxl-sub]").textContent=up?"সাইন আপ":"লগইন";this.textContent=up?"অ্যাকাউন্ট আছে? লগইন করুন":"অ্যাকাউন্ট নেই? সাইন আপ করুন"};q("[data-hxl-g]").onclick=function(){hexaDB.loginWithGoogle()};f.onsubmit=function(e){e.preventDefault();var em=q("[data-hxl-em]").value,pw=q("[data-hxl-pw]").value;q("[data-hxl-err]").textContent="";(up?hexaDB.signup(em,pw,q("[data-hxl-n]").value):hexaDB.login(em,pw)).then(function(){o.classList.remove("on");paint()}).catch(function(x){q("[data-hxl-err]").textContent=(x&&x.message)||"হয়নি, আবার চেষ্টা করুন"})};setTimeout(paint,300)})();</script></div>`;

/** True when the page already has its own login/sign-up UI. */
const hasLoginUi = (html: string) => /hexaDB\.(login|signup|loginWithGoogle)\s*\(/.test(html.replace(/<script data-hexa-db>[\s\S]*?<\/script>/g, "").replace(/<div data-hexa-login>[\s\S]*?<\/script><\/div>/g, ""));

/** Idempotently puts the hexaDB client at the top of <head>. */
export function injectBackend(html: string, origin: string, projectId: string) {
  if (!html) return html;
  const clean = html.replace(/<script data-hexa-db>[\s\S]*?<\/script>/g, "");
  const tag = CLIENT(`${origin}/api/public/db/${projectId}`);
  let out = /<head[^>]*>/i.test(clean) ? clean.replace(/<head[^>]*>/i, (m) => m + tag) : tag + clean;
  out = out.replace(/<div data-hexa-login>[\s\S]*?<\/script><\/div>/g, "");
  if (!hasLoginUi(out) && /<\/body>/i.test(out)) out = out.replace(/<\/body>(?![\s\S]*<\/body>)/i, LOGIN_UI + "\n</body>");
  return out;
}

export const SCHEMA_SYS = `You design a tiny backend for a website. From the user's request, output ONLY JSON:
{"tables":[{"name":"snake_case_english","private":false,"description":"<short Bangla>","columns":[{"name":"snake_case","type":"text|number|boolean|date|json"}]}]}
Rules: max 5 tables, max 12 columns each. Do NOT include id, project_id, created_at, owner_id (automatic). Visitor accounts (login/signup) are built in — never create a users table. Set "private": true only for per-visitor data (e.g. cart, my orders). Public form submissions (contact, booking) are "private": false.`;


export const BACKEND_KEYWORDS = /\b(log ?in|sign ?up|sign ?in|register|database|backend|admin ?panel|dashboard|reservation|booking|order|checkout|cart)\b|লগইন|লগ ইন|সাইন ?আপ|সাইন ?ইন|রেজিস্ট্রেশন|নিবন্ধন|ডেটাবেস|ডাটাবেস|ব্যাকএন্ড|অ্যাডমিন|এডমিন|রিজার্ভেশন|বুকিং|অর্ডার|কার্ট/i;

function parseSchemaJson(t: string): any {
  t = t.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a < 0 || z < a) return null;
  try { return JSON.parse(t.slice(a, z + 1)); } catch { return null; }
}

/** Designs tables with the AI (1 retry), creates them, turns the backend on. Never fails just because the AI output was bad. */
export async function autoSetupBackend(db: any, p: any, userId: string, prompt: string, providers: any[], tokensPerCoin: number, existing?: any[]) {
  const ex: any[] = existing ?? (await db.from("backend_tables").select("table_name, schema_json").eq("project_id", p.id)).data ?? [];
  const ctxTables = ex.map((t: any) => `${t.table_name}(${(t.schema_json?.columns ?? []).map((c: any) => c.name).join(",")})`).join("; ");
  const userMsg = (ctxTables ? `Existing tables (do not repeat): ${ctxTables}\n\n` : "") + prompt.slice(0, 3000);
  let parsed: any = null; let tokens = 0;
  for (let attempt = 0; attempt < 2 && !parsed?.tables; attempt++) {
    const sys = SCHEMA_SYS + (attempt ? "\n\nCRITICAL: Output ONLY the JSON object. No explanation, no markdown." : "");
    for (const pr of providers) {
      try {
        const r = await fetch(pr.base_url.replace(/\/+$/, "") + "/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${pr.api_key}`, "Content-Type": "application/json", ...((pr.custom_headers as Record<string, string>) ?? {}) },
          body: JSON.stringify({ model: pr.model, temperature: 0.2, max_tokens: 1500, messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }] }),
          signal: AbortSignal.timeout(60000),
        });
        if (!r.ok) continue;
        const j: any = await r.json();
        const t = String(j.choices?.[0]?.message?.content ?? "");
        tokens += j.usage?.total_tokens ?? Math.ceil((sys.length + userMsg.length + t.length) / 4);
        parsed = parseSchemaJson(t);
        break;
      } catch (e) { console.error("schema ai", e); }
    }
  }
  const coins = Math.round((tokens / Math.max(1, tokensPerCoin)) * 100) / 100;
  if (coins > 0) await db.rpc("add_coins", { _user: userId, _amount: -coins, _type: "spend", _reason: "ব্যাকএন্ড সেটআপ" });
  const { maxTables } = await backendLimits(db);
  const have = new Set(ex.map((t: any) => t.table_name));
  const created: string[] = [];
  const wanted: any[] = Array.isArray(parsed?.tables) ? parsed.tables : [];
  for (const t of wanted) {
    const name = String(t?.name ?? "").toLowerCase();
    if (!NAME_RE.test(name) || have.has(name)) continue;
    if (have.size >= maxTables) break;
    const columns = (Array.isArray(t.columns) ? t.columns : []).slice(0, 12)
      .map((c: any) => ({ name: String(c?.name ?? "").toLowerCase(), type: ["text", "number", "boolean", "date", "json"].includes(c?.type) ? c.type : "text" }))
      .filter((c: any) => NAME_RE.test(c.name) && !["id", "project_id", "created_at", "owner_id"].includes(c.name));
    if (!columns.length) continue;
    const { error } = await db.from("backend_tables").insert({ project_id: p.id, table_name: name, schema_json: { columns, private: !!t.private, description: String(t.description ?? "").slice(0, 200) } });
    if (!error) { have.add(name); created.push(name); }
  }
  const upd: any = { backend_enabled: true };
  if (p.code_html) { const { appOrigin } = await import("@/lib/origin.server"); upd.code_html = injectBackend(p.code_html, appOrigin(), p.id); }
  await db.from("projects").update(upd).eq("id", p.id);
  const warning = !parsed?.tables && !created.length ? "টেবিল বানানো যায়নি, লগইন চালু হয়েছে" : undefined;
  return { ok: true as const, created, coins, limitHit: have.size >= maxTables && created.length < wanted.length, warning };
}
