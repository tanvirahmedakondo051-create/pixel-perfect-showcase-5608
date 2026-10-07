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
Errors throw Error with a Bangla message — show them to the visitor.
Tables:\n${tables || "(none yet)"}${react ? "\nIn React, declare `declare global { interface Window { hexaDB: any } }`, wrap it in hooks (useTable) and an AuthContext. Do NOT install supabase-js." : ""}`;
}

const CLIENT = (api: string) => `<script data-hexa-db>(function(){var A=${JSON.stringify(api)},K="hexa_auth",S=null;try{S=JSON.parse(localStorage.getItem(K)||"null")}catch(e){}
function save(v){S=v;try{v?localStorage.setItem(K,JSON.stringify(v)):localStorage.removeItem(K)}catch(e){}}
try{var H=location.hash;if(H.indexOf("hexa_token=")>-1){var q=new URLSearchParams(H.slice(1)),u=q.get("hexa_user"),er=q.get("hexa_error");if(q.get("hexa_token")&&u){u=JSON.parse(decodeURIComponent(escape(atob(u.replace(/-/g,"+").replace(/_/g,"/")))));save({token:q.get("hexa_token"),user:u})}history.replaceState(null,"",location.pathname+location.search)}else if(H.indexOf("hexa_error=")>-1){var e2=new URLSearchParams(H.slice(1)).get("hexa_error");history.replaceState(null,"",location.pathname+location.search);setTimeout(function(){alert(e2)},50)}}catch(e){}
function req(p,o){o=o||{};var h={"content-type":"application/json"};if(S&&S.token)h.authorization="Bearer "+S.token;return fetch(A+p,{method:o.method||"GET",headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"সমস্যা হয়েছে");return j})})}
window.hexaDB={list:function(t){return req("/t/"+t).then(function(j){return j.rows})},insert:function(t,d){return req("/t/"+t,{method:"POST",body:d}).then(function(j){return j.row})},remove:function(t,id){return req("/t/"+t+"?id="+encodeURIComponent(id),{method:"DELETE"})},
signup:function(e,p,n){return req("/auth",{method:"POST",body:{action:"signup",email:e,password:p,name:n}}).then(function(j){save(j);return j})},login:function(e,p){return req("/auth",{method:"POST",body:{action:"login",email:e,password:p}}).then(function(j){save(j);return j})},loginWithGoogle:function(){location.href=A+"/google?return="+encodeURIComponent(location.href.split("#")[0])},logout:function(){save(null)},user:function(){return S&&S.user||null}};})();</script>`;

/** Idempotently puts the hexaDB client at the top of <head>. */
export function injectBackend(html: string, origin: string, projectId: string) {
  if (!html) return html;
  const clean = html.replace(/<script data-hexa-db>[\s\S]*?<\/script>/g, "");
  const tag = CLIENT(`${origin}/api/public/db/${projectId}`);
  return /<head[^>]*>/i.test(clean) ? clean.replace(/<head[^>]*>/i, (m) => m + tag) : tag + clean;
}
