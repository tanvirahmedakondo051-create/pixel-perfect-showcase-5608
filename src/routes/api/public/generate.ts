import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().max(8000).optional().default(""),
  providerId: z.string().uuid().optional().nullable(),
  mode: z.enum(["plan", "build"]).optional().default("build"),
  intent: z.enum(["run", "ask"]).optional().default("run"),
  resumeId: z.string().uuid().optional().nullable(),
  chained: z.boolean().optional(),
  planId: z.string().max(80).optional().nullable(),
  attachments: z.array(z.object({ path: z.string().max(200), url: z.string().url().max(400), name: z.string().max(120), type: z.string().max(60) })).max(4).optional().default([]),
});

const PLAN_FORMAT = `

FORMAT: Reply in Bangla. Never output HTML or code. When proposing a site plan start with "# " + a short title (e.g. "# রেস্টুরেন্ট সাইট — অনলাইন বুকিং সহ"), then "## ইউজার কী পাবে" (3-6 short bullets of what visitors/owner get), then "## অংশসমূহ" (numbered sections with one line each), "## ফিচার" (bullets), "## ডিজাইন" (colors with hex, fonts, style/animation). Keep it concise. When you ask a question, put each quick-tap option on its own line as [[option text]] (3-4 options) and do NOT use the plan headings.
NEVER ask which backend/database/stack/hosting to use — Hexarly has a built-in backend (hexaDB: tables, visitor login, Google login) that is set up automatically.`;

type Msg = { role: "user" | "assistant"; content: string; at: string; mode?: "plan" | "build"; id?: string; ms?: number; coins?: number; title?: string; kind?: string; [k: string]: any };
type Step = { id: string; title: string; brief: string };
const MARK = "<!--HEXA:NEXT-->";
const PREMIUM = `

PREMIUM QUALITY (TOP PRIORITY — never trade quality for brevity):
- Lovable-level, professional, detailed and rich. NEVER minimal, bare or skeletal.
- Premium hero: strong headline, supporting text, clear CTA buttons, soft gradient/mesh or layered background, staggered entrance animations.
- 6-8 rich sections with real Bangla content depth (no 2-line filler): e.g. services/features with details, stats/numbers, process steps, showcase/gallery, testimonials, FAQ, contact form — vary layouts (grids, split, bento, timeline).
- Smooth scroll-reveal animations (IntersectionObserver), hover lift/glow on cards and buttons, smooth scrolling, sticky blurred header with mobile menu.
- Professional typography scale, generous spacing, consistent color system, icons, badges, dividers, styled footer with links.
- Complete, polished code; no placeholders, no lorem ipsum, no inline base64 images.
- ANIMATED HERO BACKGROUND (required, never a flat color). Built-in classes are auto-included, do NOT write their CSS:
  a) Mesh: hero has position:relative;overflow:hidden; first child <div class="hx-mesh" aria-hidden="true"><span></span><span></span></div>; hero content gets position:relative;z-index:1.
  b) Gradient: add class "hx-gradient" to the hero (or a CTA strip).
  Set palette on the hero: style="--hx-c1:#..;--hx-c2:#..;--hx-c3:#..;--hx-c4:#.." from the site colors. Keep text readable (add a subtle dark/light overlay if needed). CTA sections may reuse hx-gradient.`;
function cleanFrag(t: string) {
  let s = t.trim();
  const f = s.match(/```[a-zA-Z]*\s*([\s\S]*?)(```|$)/);
  if (f) s = f[1].trim();
  s = s.replace(/<!doctype[^>]*>|<\/?(html|head|body)[^>]*>/gi, "");
  const a = s.search(/<(section|footer|div|header|nav|main)/i);
  if (a > 0) s = s.slice(a);
  return s.trim();
}

function dhakaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

const STRICT_RULE = `

STRICT OUTPUT RULE (MUST FOLLOW):
- Output ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>.
- NO JSON, NO tool calls (e.g. fs_write), NO markdown code fences, NO explanation before or after.

STYLE INSPIRATION: If the user provides an analyzed website (colors, fonts, layout), use the analyzed colors, fonts, and layout style as inspiration. Create ORIGINAL content, do not copy text or images.

ASSETS: When appropriate, use professional assets from the library instead of plain divs. Prefer Lottie for animations (via <script src="https://unpkg.com/@lottiefiles/lottie-player@2/dist/lottie-player.js"></script> and <lottie-player>), SVG icons for UI elements.

IMAGES: Use ONLY photo URLs given in this prompt (PHOTOS list / user uploads / asset library). NEVER invent or guess image URLs (no made-up images.unsplash.com IDs, no placeholder services). If no photo fits, use gradient/SVG visuals.

MULTI-PAGE: If the user asks for several pages (e.g. About, Contact), keep one HTML file: wrap each page in <section data-page="home|about|contact|..."> (first = home) and link with href="#/about", "#/" etc. A built-in router shows one page at a time and handles back/forward — do not write your own router. Single-page sites use normal #id anchors.

BACKEND: Hexarly has a built-in backend (hexaDB: tables, visitor login/sign-up, Google login). Never mention or ask about backend technology, databases, Firebase, PHP, hosting or stacks.`;

const REACT_RULE = `

REACT + VITE PROJECT — STRICT OUTPUT RULE (MUST FOLLOW):
- Output a JSON object with files array: {"files": [{"path": "src/App.tsx", "content": "..."}]}. Output ONLY this JSON, no markdown fences, no explanation.
- Include package.json (scripts.build = "vite build"; deps: react, react-dom, framer-motion; devDeps: vite, @vitejs/plugin-react, typescript, tailwindcss@3, postcss, autoprefixer), vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, index.html, src/main.tsx, src/index.css and all other src files.
- ANIMATION with framer-motion (import { motion, AnimatePresence, useReducedMotion } from "framer-motion"): scroll-reveal sections with initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{ once: true, amount: 0.2 }}; stagger lists/cards via parent variants (staggerChildren 0.08-0.12); whileHover (y:-6 / scale 1.02) and whileTap (scale 0.97) on buttons and cards; wrap section/view switches in <AnimatePresence mode="wait"> with fade/slide transitions; call useReducedMotion() and skip movement (opacity only or none) when true. Animate only transform/opacity.
- Complete working code, no placeholders, no TODOs. NEVER output a single HTML file. Do not use react-router (use simple state-based sections or hash links). No images from local paths; use https URLs.
- Complete, polished, professional UI with animations and rich content; never minimal.
- Hero background MUST be an animated mesh/gradient (slow drifting blurred radial blobs or background-position shift, 15-25s loops, transform/background only) defined in your own CSS, never a flat color; disable animation under prefers-reduced-motion.
STYLE INSPIRATION: If the user provides an analyzed website, use its colors, fonts and layout as inspiration but create ORIGINAL content.`;

function parseFiles(text: string): { path: string; content: string }[] | null {
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try {
    const j = JSON.parse(t.slice(a, b + 1));
    const files = (Array.isArray(j) ? j : j.files) as any[];
    if (!Array.isArray(files)) return null;
    const out = files.filter((f) => f && typeof f.path === "string" && typeof f.content === "string" && !f.path.includes("..") && !f.path.startsWith("/"))
      .slice(0, 150).map((f) => ({ path: f.path.replace(/^\.\//, ""), content: f.content }));
    return out.some((f) => f.path === "package.json") && out.some((f) => f.path === "index.html") ? out : null;
  } catch { return null; }
}

function findHtmlInJson(v: any): string | null {
  if (typeof v === "string") return /<html|<!doctype/i.test(v) ? v : null;
  if (Array.isArray(v)) {
    for (const x of v) { const r = findHtmlInJson(x); if (r) return r; }
    return null;
  }
  if (v && typeof v === "object") {
    for (const k of ["contents", "content", "html", "code", "text"]) {
      const r = findHtmlInJson(v[k]); if (r) return r;
    }
    for (const k of Object.keys(v)) { const r = findHtmlInJson(v[k]); if (r) return r; }
  }
  return null;
}

function unescapeLiteral(s: string) {
  return s
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\");
}

function extractHtml(text: string) {
  let s = text.trim();
  // 1. Strip markdown fences
  const fence = s.match(/```[a-zA-Z]*\s*([\s\S]*?)(```|$)/);
  if (fence && !/^\s*<!doctype|^\s*<html/i.test(s)) s = fence[1].trim();
  // 2. JSON wrappers (tool calls like fs_write)
  const jStart = s.indexOf("{");
  const jEnd = s.lastIndexOf("}");
  if (jStart >= 0 && jEnd > jStart && !/^\s*<!doctype|^\s*<html/i.test(s)) {
    try {
      const found = findHtmlInJson(JSON.parse(s.slice(jStart, jEnd + 1)));
      if (found) s = found;
    } catch {
      const m = s.match(/"(?:contents|content|html)"\s*:\s*"([\s\S]*)"\s*[},]/);
      if (m) s = m[1];
    }
  }
  // 3. Literal escape sequences → real characters
  if (/\\n|\\"/.test(s) && !/\n/.test(s.slice(0, 200))) s = unescapeLiteral(s);
  else if (/\\n/.test(s) && /<!doctype html>\\n|<\/\w+>\\n/i.test(s)) s = unescapeLiteral(s);
  // 4. Trim before <!DOCTYPE / <html and after </html>
  const start = s.search(/<!doctype html|<html/i);
  if (start > 0) s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end > 0) s = s.slice(0, end + 7);
  return s.trim();
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/public/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        // Two callers: the browser (creates a background job) or the database job runner (runs it, no browser needed).
        const jobId = request.headers.get("x-hexa-job");
        let job: any = null;
        let user: any = null;
        let body: z.infer<typeof Body>;
        if (jobId) {
          const { data: sec } = await db.from("app_secrets").select("value").eq("name", "job_token").maybeSingle();
          const { createHmac, timingSafeEqual } = await import("node:crypto");
          const exp = Buffer.from(createHmac("sha256", sec?.value ?? "").update(jobId).digest("hex"));
          const got = Buffer.from(request.headers.get("x-hexa-sig") ?? "");
          if (!sec?.value || exp.length !== got.length || !timingSafeEqual(exp, got)) return json(401, "unauthorized");
          const { data: j } = await db.from("generation_jobs").select("*").eq("id", jobId).maybeSingle();
          if (!j || !["running", "queued"].includes(j.status)) return json(409, "job not active");
          job = j;
          const { data: au } = await db.auth.admin.getUserById(j.user_id);
          user = au?.user;
          if (!user) return json(404, "no user");
          try { body = Body.parse(j.input); } catch { await db.rpc("job_push" as any, { _id: jobId, _events: [{ t: "error", msg: "অনুরোধটি সঠিক নয়" }], _status: "error" } as any); return json(400, "bad input"); }
        } else {
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!token) return json(401, "লগইন করুন");
          const { data: u } = await db.auth.getUser(token);
          user = u?.user;
          if (!user) return json(401, "লগইন সেশন শেষ, আবার লগইন করুন");
          try {
            body = Body.parse(await request.json());
          } catch {
            return json(400, "অনুরোধটি সঠিক নয়");
          }
        }
        const failJob = async (status: number, msg: string) => {
          if (job) await db.rpc("job_push" as any, { _id: job.id, _events: [{ t: "error", msg: msg === "COINS_OUT" ? "🪙 কয়েন শেষ!" : msg }], _status: "error" } as any);
          return json(status, msg);
        };
        const ac = new AbortController();
        // Job runner ignores its caller disconnecting: only an explicit cancel stops it.
        const sig = jobId ? ac.signal : AbortSignal.any([request.signal, ac.signal]);

        const { effectivePlan, allowedProviders } = await import("@/lib/plan.server");
        const [profile, { data: settings }, { data: project }] = await Promise.all([
          effectivePlan(db, user.id),
          db.from("site_settings").select("*").eq("id", 1).single(),
          db.from("projects").select("*").eq("id", body.projectId).single(),
        ]);
        if (!profile || !settings) return failJob(500, "সার্ভারে সমস্যা হয়েছে");
        if (!project || project.user_id !== user.id) return failJob(404, "প্রজেক্ট পাওয়া যায়নি");
        if (profile.is_banned) return failJob(403, "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে");
        let resumeCp: any = null;
        if (body.resumeId) {
          const { data } = await db.from("task_checkpoints" as any).select("*").eq("id", body.resumeId).maybeSingle();
          if (!data || (data as any).user_id !== user.id || (data as any).project_id !== project.id || (data as any).status !== "paused") return failJob(400, "এই চেকপয়েন্ট থেকে আর চালু করা যাবে না");
          resumeCp = data;
          body.mode = "build";
        }
        // Approved plan: the plan text is loaded server-side; the chat only shows a short approval line.
        const planMsg = !resumeCp && body.planId ? ((project.messages as any[]) ?? []).find((m) => m.id === body.planId && m.mode === "plan" && m.role === "assistant") : null;
        if (body.planId && !resumeCp && !planMsg) return failJob(404, "প্ল্যানটি পাওয়া যায়নি");
        const prompt: string = resumeCp ? resumeCp.prompt : planMsg ? `এই অনুমোদিত প্ল্যান অনুযায়ী সম্পূর্ণ ওয়েবসাইট বানাও:\n\n${String(planMsg.content).replace(/\[\[(.+?)\]\]/g, "").trim()}` : body.prompt;
        const shownPrompt: string = planMsg ? body.prompt || "✅ প্ল্যান অনুমোদিত — বানানো শুরু হচ্ছে..." : prompt;
        if (!prompt.trim()) return failJob(400, "অনুরোধটি সঠিক নয়");
        if (settings.require_email_verify && !user.email_confirmed_at) return failJob(403, "আগে ইমেইল ভেরিফাই করুন");

        const today = dhakaToday();
        let used = profile.tokens_used_today;
        if (profile.last_reset_date < today) {
          used = 0;
          await db.from("profiles").update({ tokens_used_today: 0, last_reset_date: today }).eq("id", user.id);
        }
        const limit = (profile.plans as any)?.tokens_per_day ?? 50000;
        const tpc = Math.max(1, (settings as any).tokens_per_coin ?? 10000);
        const coinsBefore = Number((profile as any).coins ?? 0);
        if (coinsBefore <= 0) return failJob(402, "COINS_OUT");
        const startedAt = Date.now();

        const since = new Date(Date.now() - 60_000).toISOString();
        const { count: recent } = await db.from("usage_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
        if (!job && !resumeCp && (recent ?? 0) >= ((profile.plans as any)?.rate_limit_per_minute ?? settings.rate_limit_per_minute) + 8) return failJob(429, "খুব দ্রুত অনুরোধ করছেন। এক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।");

        const providers = await allowedProviders(db, profile.plans);
        if (!providers?.length) return failJob(503, "এখনো কোনো AI সংযুক্ত করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।");
        const ordered = body.providerId
          ? [...providers.filter((p) => p.id === body.providerId), ...providers.filter((p) => p.id !== body.providerId)]
          : providers;

        // Browser call: queue a background job and return at once. The database starts the runner, so closing the tab doesn't stop it.
        if (!job && body.intent !== "ask") {
          const { data: running } = await db.from("generation_jobs").select("id").eq("project_id", project.id).in("status", ["queued", "running"]).gte("heartbeat_at", new Date(Date.now() - 120_000).toISOString()).limit(1).maybeSingle();
          if (running) return Response.json({ jobId: running.id, existing: true }, { status: 202 });
          const { appOrigin: ao } = await import("@/lib/origin.server");
          let origin = ao();
          const pm = origin.match(/^https:\/\/id-preview--([0-9a-f-]{36})\.lovable\.app$/);
          if (pm) origin = `https://project--${pm[1]}-dev.lovable.app`;
          if (origin.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin)) origin = "https://" + origin.slice(7);
          const { data: nj, error: je } = await db.from("generation_jobs").insert({ project_id: project.id, user_id: user.id, mode: body.mode, input: body as any, origin }).select("id").single();
          if (je || !nj) return json(500, "সার্ভারে সমস্যা হয়েছে");
          console.log("[job] created", nj.id, "origin", origin);
          try {
            const { error: ke } = await db.rpc("kick_job" as any, { _id: nj.id } as any);
            if (ke) throw ke;
          } catch (e) {
            const msg = "সার্ভার কাজটি শুরু করতে পারেনি। আবার চেষ্টা করুন।";
            console.error("[job] kick failed", nj.id, origin, e);
            try { await db.rpc("job_push" as any, { _id: nj.id, _events: [{ t: "error", msg }], _status: "error" } as any); } catch {}
            return json(503, msg);
          }
          return Response.json({ jobId: nj.id }, { status: 202 });
        }

        // Asset library: only for new builds, short list of small/URL assets (keeps system prompt small).
        const { data: libAssets } = project.code_html ? { data: [] as any[] } : await db.from("assets").select("name, category, type, url_or_code").neq("category", "icon").order("created_at", { ascending: false }).limit(20);
        const assetCtx = (libAssets ?? []).filter((a: any) => a.url_or_code.length < 300 || /^https?:/.test(a.url_or_code)).slice(0, 8)
          .map((a: any) => `- [${a.category}/${a.type}] ${a.name}: ${a.url_or_code}`).join("\n");
        const history = (project.messages as Msg[]) ?? [];
        const isPlan = body.mode === "plan";
        const s2 = settings as any;
        const { relevantContext, outline, applyPatches, applySections, tagSections, SECTION_RULE, DIFF_RULE } = await import("@/lib/context.server");
        if (project.code_html && body.mode !== "plan" && (project as any).project_type !== "react") project.code_html = tagSections(project.code_html);
        const { data: sum } = await db.from("chat_summaries").select("summary_text, up_to_message_id").eq("project_id", project.id).order("up_to_message_id", { ascending: false }).limit(1).maybeSingle();
        const summaryMsg = sum ? [{ role: "system", content: `CHAT SUMMARY SO FAR: ${sum.summary_text}` }] : [];
        const recentHist = history.slice(Math.max(sum?.up_to_message_id ?? 0, history.length - 5));

        // Attachments (images go to the AI as vision input) + auto-analyse the first link in the message.
        const atts = body.attachments.filter((a) => a.path.startsWith(project.id + "/"));
        const imageParts: any[] = [];
        for (const a of atts.filter((x) => x.type.startsWith("image/") && x.type !== "image/svg+xml")) {
          const { data: signed } = await db.storage.from("uploads").createSignedUrl(a.path, 3600);
          if (signed?.signedUrl) imageParts.push({ type: "image_url", image_url: { url: signed.signedUrl } });
        }
        let extra = "";
        if (atts.length) extra += `\n\nUSER UPLOADED FILES (use these exact URLs in the site when relevant, e.g. as <img src>):\n${atts.map((a) => `- ${a.name} (${a.type}): ${a.url}`).join("\n")}`;
        const link = prompt.match(/https?:\/\/[^\s<>"']+|(?:www\.)[a-z0-9-]+\.[a-z]{2,}[^\s<>"']*/i)?.[0];
        if (link) {
          const { analyzeUrl, analysisContext } = await import("@/lib/analyze.server");
          const r = await analyzeUrl(link).catch(() => null);
          if (r && "ok" in r) extra += "\n\n" + analysisContext(r.analysis);
        }
        const withExtra = (text: string) => (imageParts.length ? [{ type: "text", text: text + extra }, ...imageParts] : text + extra);

        const [{ data: pack }, { data: analysis }, { data: always }] = await Promise.all([
          (project as any).skill_pack_id ? db.from("skill_packs").select("slug, name_bn, system_prompt").eq("id", (project as any).skill_pack_id).maybeSingle() : Promise.resolve({ data: null } as any),
          db.from("project_analysis").select("*").eq("project_id", project.id).maybeSingle(),
          db.from("skill_packs").select("slug, system_prompt").in("slug", ["design-quality", "taste"]).eq("is_active", true),
        ]);
        let skillCtx = pack?.system_prompt ? `\n\n${pack.system_prompt}` : "";
        for (const a of (always ?? []) as { slug: string; system_prompt: string }[]) if (a.system_prompt && (pack as any)?.slug !== a.slug) skillCtx += `\n\n${a.system_prompt}`;
        let freeAssets = "";
        if (!project.code_html && (project as any).project_type !== "react") {
          const { selectAssets } = await import("@/lib/assets.server");
          freeAssets = await selectAssets(db, prompt, (pack as any)?.slug).catch(() => "");
        }
        if (analysis) {
          const files = ((analysis.file_map_json as any[]) ?? []).slice(0, 60).map((f) => `- ${f.path} (${f.role})`).join("\n");
          skillCtx += `\n\nIMPORTED CODEBASE CONTEXT: This site was imported from GitHub. Framework/style: ${analysis.framework}. Entry: ${analysis.entry_file}. Files:\n${files}\nLocal CSS/JS were inlined into the single HTML. Preserve the existing framework, class naming, colors and structure; make precise targeted edits only.`;
        }
        const isReact = (project as any).project_type === "react";
        const { backendContext, injectBackend, autoSetupBackend, BACKEND_KEYWORDS } = await import("@/lib/backend.server");
        const { appOrigin } = await import("@/lib/origin.server");
        // Auto backend: prompt needs login/booking/orders etc. → set up tables before building (first step only).
        if (job && !isPlan && body.intent !== "ask" && !resumeCp && !(project as any).backend_enabled && BACKEND_KEYWORDS.test(prompt)) {
          try {
            await db.rpc("job_push" as any, { _id: job.id, _events: [{ t: "progress", step: "ডেটাবেস সেট আপ করছি...", tokens: 0 }], _status: "running" } as any);
            const r = await autoSetupBackend(db, project, user.id, prompt, ordered, tpc);
            (project as any).backend_enabled = true;
            const msg = r.created.length ? `⚡ ডেটাবেস চালু — টেবিল: ${r.created.join(", ")}` : `⚡ ${r.warning ?? "ডেটাবেস চালু হয়েছে"}`;
            await db.rpc("job_push" as any, { _id: job.id, _events: [{ t: "notice", msg }], _status: "running" } as any);
          } catch (e) { console.error("[auto-backend]", e); }
        }
        const beCtx = (project as any).backend_enabled ? await backendContext(db, project.id, isReact) : "";
        const buildSystem = (s2.build_prompt || settings.system_prompt || "") + skillCtx + STRICT_RULE + freeAssets + (assetCtx ? `\n\nASSET LIBRARY (use when it fits):\n${assetCtx}` : "") + beCtx;
        const hasSite = !isPlan && !!project.code_html;
        const ctx = hasSite ? relevantContext(project.code_html, prompt) : null;
        const recentMsgs = recentHist.filter((m) => m.role === "user").slice(-2).map((m) => ({ role: "user", content: m.content.slice(0, 600) }));

        const planMessages = [
          { role: "system", content: (s2.plan_prompt ?? "") + skillCtx + PLAN_FORMAT + (project.code_html ? `\n\nThe user already has a website with these sections:\n${outline(project.code_html)}` : "") },
          ...summaryMsg,
          ...recentHist.filter((m) => m.mode === "plan").map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: withExtra(prompt) },
        ];
        const diffMessages = hasSite ? [
          { role: "system", content: buildSystem.replace(/STRICT OUTPUT RULE[\s\S]*?explanation before or after\./, "") + SECTION_RULE + "\n\nIf a change cannot be expressed as whole blocks, you may instead use:" + DIFF_RULE },
          ...summaryMsg,
          ...recentMsgs,
          { role: "user", content: withExtra(`পেজের কাঠামো:\n${outline(project.code_html)}\n\n${ctx!.partial ? "প্রাসঙ্গিক অংশ" : "সম্পূর্ণ HTML"}:\n${ctx!.snippets.join("\n\n<!-- ... -->\n\n")}\n\nপরিবর্তনের অনুরোধ: ${prompt}`) },
        ] : null;
        const fullMessages = [
          { role: "system", content: buildSystem },
          ...summaryMsg,
          ...recentMsgs,
          { role: "user", content: withExtra(hasSite ? `এই ওয়েবসাইটটি আছে:\n\`\`\`html\n${project.code_html}\n\`\`\`\n\nপরিবর্তনের অনুরোধ: ${prompt}\n\nসম্পূর্ণ আপডেট করা HTML ফাইলটি দিন।` : prompt) },
        ];

        // Clarifying questions before a new site build (max 3).
        if (body.intent === "ask") {
          // Detailed prompts or a chosen site type need no questions — saves a whole AI call.
          if (isPlan || project.code_html || isReact || prompt.trim().split(/\s+/).length >= 12 || (pack && prompt.trim().split(/\s+/).length >= 5)) return Response.json({ questions: [] });
          const sys = `You help a Bangla website builder decide whether to ask clarifying questions BEFORE building. If the request already has enough detail (business name/type, style/colors, key sections), return {"questions":[]}. Never ask about backend, database, technology stack or hosting (built in). Otherwise return 1-3 short Bangla questions, each with 3-4 short Bangla quick-answer options. Output ONLY JSON: {"questions":[{"q":"...","options":["...","..."]}]}`;
          for (const p of ordered) {
            try {
              const r = await fetch(p.base_url.replace(/\/+$/, "") + "/chat/completions", {
                method: "POST", signal: sig,
                headers: { Authorization: `Bearer ${p.api_key}`, "Content-Type": "application/json", ...((p.custom_headers as Record<string, string>) ?? {}) },
                body: JSON.stringify({ model: p.model, stream: false, max_tokens: 600, temperature: 0.3, messages: [{ role: "system", content: sys + skillCtx.slice(0, 1500) }, { role: "user", content: prompt }] }),
              });
              if (!r.ok) continue;
              const j: any = await r.json();
              const t = String(j.choices?.[0]?.message?.content ?? "");
              const tk = j.usage?.total_tokens ?? Math.ceil((sys.length + prompt.length + t.length) / 4);
              const coins = Math.round((tk / tpc) * 100) / 100;
              await Promise.all([
                coins > 0 ? db.rpc("add_coins" as any, { _user: user.id, _amount: -coins, _type: "spend", _reason: "প্রশ্ন তৈরি" } as any) : null,
                db.from("profiles").update({ tokens_used_today: used + tk, last_reset_date: today }).eq("id", user.id),
              ]);
              let qs: any[] = [];
              try { qs = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)).questions ?? []; } catch { /* none */ }
              const questions = qs.filter((q) => q?.q).slice(0, 3).map((q) => ({ q: String(q.q).slice(0, 200), options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((o: any) => String(o).slice(0, 60)) }));
              return Response.json({ questions, coins });
            } catch { if (sig.aborted) break; }
          }
          return Response.json({ questions: [] });
        }

        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller0) {
            // Inner code "closes" freely; the real close happens after job events are saved.
            const controller = { enqueue: (c: Uint8Array) => controller0.enqueue(c), close: () => {} };
            const evq: any[] = [];
            let finalStatus: string | null = null;
            let lastFlush = 0;
            let chain: Promise<unknown> = Promise.resolve();
            const flushJob = (end = false) => {
              if (!job) return;
              lastFlush = Date.now();
              chain = chain.then(async () => {
                const evs = evq.splice(0);
                const { data: st } = await db.rpc("job_push" as any, { _id: job.id, _events: evs, _status: end ? (finalStatus ?? "done") : null } as any);
                if (st === "cancelled") ac.abort();
              }).catch((e) => console.error("job_push", e));
            };
            const send = (o: any) => {
              try { controller0.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* runner disconnected */ }
              if (!job || o.t === "delta") return;
              if (o.t === "done") finalStatus = "done";
              else if (o.t === "paused") finalStatus = "paused";
              else if (o.t === "error") finalStatus = finalStatus ?? "error";
              evq.push(o);
              if (["done", "paused", "error", "checkpoint", "files"].includes(o.t) || Date.now() - lastFlush > 1500) flushJob();
            };
            try {
            await (async () => {
            let usedProvider: any = null;
            let baseTokens = 0;
            let verifyNote = "";
            send({ t: "progress", step: "অনুরোধ বিশ্লেষণ করছি...", tokens: 0 });

            const run = async (messages: any[], live: boolean): Promise<{ full: string; tokens: number } | null> => {
              let res: Response | null = null;
              const list = usedProvider ? [usedProvider, ...ordered.filter((p) => p.id !== usedProvider.id)] : ordered;
              for (let i = 0; i < list.length; i++) {
                const p = list[i];
                if (i > 0) send({ t: "notice", msg: "মূল AI ব্যস্ত, বিকল্প ব্যবহার করা হচ্ছে..." });
                try {
                  const r = await fetch(p.base_url.replace(/\/+$/, "") + "/chat/completions", {
                    method: "POST",
                    signal: sig,
                    headers: { Authorization: `Bearer ${p.api_key}`, "Content-Type": "application/json", ...((p.custom_headers as Record<string, string>) ?? {}) },
                    body: JSON.stringify({ model: p.model, messages, stream: true, stream_options: { include_usage: true }, max_tokens: Math.min(p.max_tokens, settings.max_output_tokens), temperature: p.temperature }),
                  });
                  if (r.ok && r.body) { res = r; usedProvider = p; break; }
                  console.error("provider failed", p.name, r.status, (await r.text()).slice(0, 300));
                } catch (e) {
                  if (sig.aborted) return null;
                  console.error("provider error", p.name, e);
                }
              }
              if (!res) return null;
              let full = "", tokens = 0, buf = "", lastP = 0;
              send({ t: "progress", step: "লিখতে শুরু করছি...", tokens: baseTokens });
              const reader = res.body!.getReader();
              const dec = new TextDecoder();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += dec.decode(value, { stream: true });
                  const lines = buf.split("\n");
                  buf = lines.pop() ?? "";
                  for (const line of lines) {
                    const l = line.trim();
                    if (!l.startsWith("data:")) continue;
                    const payload = l.slice(5).trim();
                    if (payload === "[DONE]") continue;
                    try {
                      const j = JSON.parse(payload);
                      const c = j.choices?.[0]?.delta?.content;
                      if (c) {
                        full += c;
                        if (live) send({ t: "delta", c });
                        const est = Math.ceil(full.length / 4);
                        if (est - lastP >= 150) {
                          lastP = est;
                          const step = /<<<<<<<|SEARCH|REPLACE/.test(c) || /<<<<<<<\s*SEARCH/.test(full.slice(-400)) ? "লেআউট ঠিক করছি..." : /<(html|body|!doctype)/i.test(full) ? (/<\/body>/i.test(full) ? "শেষ ছোঁয়া দিচ্ছি..." : "HTML লিখছি...") : "পরিকল্পনা লিখছি...";
                          send({ t: "progress", step, tokens: baseTokens + est });
                        }
                      }
                      if (j.usage?.total_tokens) tokens = j.usage.total_tokens;
                    } catch { /* partial line */ }
                  }
                }
              } catch (e) {
                if (!sig.aborted) console.error("stream read", e);
              }
              if (!tokens) tokens = Math.ceil((JSON.stringify(messages).length + full.length) / 4);
              return { full, tokens };
            };

            const finishSummary = async (msgs: Msg[]) => {
              const from = sum?.up_to_message_id ?? 0;
              const upTo = msgs.length - 5;
              if (upTo - from < 10 || !usedProvider) return;
              try {
                const p = usedProvider;
                const text = msgs.slice(from, upTo).map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 400)}`).join("\n");
                const r = await fetch(p.base_url.replace(/\/+$/, "") + "/chat/completions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${p.api_key}`, "Content-Type": "application/json", ...((p.custom_headers as Record<string, string>) ?? {}) },
                  body: JSON.stringify({ model: p.model, max_tokens: 300, temperature: 0.2, messages: [
                    { role: "system", content: "Summarize this website-building chat in short Bangla, max 4 sentences, format: 'User wants X. Tried Y. Current: Z.' Output only the summary." },
                    { role: "user", content: (sum ? `Previous summary: ${sum.summary_text}\n\n` : "") + text },
                  ] }),
                  signal: AbortSignal.timeout(25000),
                });
                if (!r.ok) return;
                const j: any = await r.json();
                const t = String(j.choices?.[0]?.message?.content ?? "").trim().slice(0, 1500);
                if (t) await db.from("chat_summaries").insert({ project_id: project.id, summary_text: t, up_to_message_id: upTo });
              } catch (e) { console.error("summary", e); }
            };

            let coinsLeft = coinsBefore;
            let chargedCoins = 0;
            const charge = async (tokens: number, saved: number, reason?: string) => {
              const coins = Math.round((tokens / tpc) * 100) / 100;
              coinsLeft -= coins; chargedCoins += coins; used += tokens;
              await Promise.all([
                coins > 0 ? db.rpc("add_coins" as any, { _user: user.id, _amount: -coins, _type: "spend", _reason: reason ?? ((isPlan ? "পরিকল্পনা: " : "ওয়েবসাইট: ") + prompt.slice(0, 60)) } as any) : null,
                db.from("usage_logs").insert({ user_id: user.id, tokens_used: tokens, provider_name: usedProvider?.name ?? null, tokens_saved: saved } as any),
                db.from("profiles").update({ tokens_used_today: used, last_reset_date: today }).eq("id", user.id),
              ]);
              return coins;
            };
            const mid = () => crypto.randomUUID();
            const r2 = (n: number) => Math.round(n * 100) / 100;
            const userMsg = (): Msg => ({ role: "user", content: shownPrompt, at: new Date().toISOString(), mode: body.mode, id: mid(), files: atts.map((a) => ({ name: a.name, url: a.url, type: a.type })) });

            if (isPlan) {
              const r = await run(planMessages, true);
              if (!r) { send({ t: "error", msg: "এই মুহূর্তে কোনো AI সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।" }); return controller.close(); }
              const now = new Date().toISOString();
              const reply = r.full.trim() || "দুঃখিত, উত্তর পাওয়া যায়নি";
              const coins = r2(r.tokens / tpc);
              const am: Msg = { role: "assistant", content: reply, at: now, mode: "plan", id: mid(), ms: Date.now() - startedAt, coins, title: "প্ল্যান: " + prompt.slice(0, 40) };
              const newMsgs: Msg[] = [...history, userMsg(), am];
              await Promise.all([db.from("projects").update({ messages: newMsgs }).eq("id", project.id), charge(r.tokens, 0)]);
              send({ t: "done", tokens: r.tokens, html: "", plan: reply, msg: am, used, limit, coins, balance: Math.max(0, coinsLeft), ms: am.ms });
              await finishSummary(newMsgs);
              return controller.close();
            }

            // ---- React + Vite project: AI writes files, VPS agent builds them, result is inlined into one HTML ----
            if (isReact) {
              const { getAgent, agentCall } = await import("@/lib/deploy.server");
              const agent = await getAgent(db);
              if (!agent) { send({ t: "error", msg: "React বিল্ড সার্ভার এখনো সেটআপ হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।" }); return controller.close(); }
              const cur: { path: string; content: string }[] = ((project as any).files as any[]) ?? [];
              const sys = (s2.build_prompt || settings.system_prompt || "") + skillCtx + REACT_RULE + beCtx;
              const curText = cur.map((f) => `--- ${f.path}\n${f.content}`).join("\n\n");
              const msgs: any[] = [
                { role: "system", content: sys }, ...summaryMsg, ...recentMsgs,
                { role: "user", content: withExtra(cur.length ? `Current project files:\n${curText.slice(0, 150000)}\n\nChange request: ${prompt}\n\nReturn the COMPLETE files JSON (all files).` : prompt) },
              ];
              const setBuild = (build_status: string, build_log = "") => db.from("projects").update({ build_status, build_log } as any).eq("id", project.id);
              const STEP: Record<string, string> = { writing: "ফাইল সেভ হচ্ছে...", installing: "ইনস্টল হচ্ছে... (npm install)", building: "বিল্ড হচ্ছে... (vite build)" };
              let files: { path: string; content: string }[] | null = null;
              let built = ""; let log = ""; let rTokens = 0;
              for (let attempt = 0; attempt < 2 && !built; attempt++) {
                send({ t: "progress", step: attempt ? "AI ভুল ঠিক করছে..." : "React কোড লিখছি...", tokens: rTokens });
                const r = await run(msgs, false);
                if (!r) { send({ t: "error", msg: "এই মুহূর্তে কোনো AI সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।" }); return controller.close(); }
                rTokens += r.tokens; baseTokens = rTokens;
                await charge(r.tokens, 0, "React সাইট: " + prompt.slice(0, 50));
                const parsed = parseFiles(r.full);
                if (!parsed) { msgs.push({ role: "assistant", content: r.full.slice(0, 2000) }, { role: "user", content: 'Your output was not valid JSON. Output ONLY {"files":[{"path":"...","content":"..."}]} with all files.' }); log = "AI সঠিক ফাইল দেয়নি"; continue; }
                files = parsed;
                send({ t: "files", files: files.map((f) => f.path) });
                try {
                  const out: any = await agentCall(agent, "/build", { projectId: project.id, files }, async (st) => {
                    if (STEP[st.step]) { send({ t: "progress", step: STEP[st.step], tokens: rTokens }); await setBuild(st.step); }
                  }, 300_000);
                  if (out?.step === "ready" && out.html) { built = out.html; break; }
                  log = String(out?.log ?? "build failed").slice(-3000);
                } catch (e: any) { log = String(e?.message ?? e).slice(0, 1000); }
                await setBuild("failed", log);
                if (attempt < 1) {
                  send({ t: "notice", msg: "বিল্ডে সমস্যা — AI নিজে ঠিক করছে..." });
                  msgs.push({ role: "assistant", content: JSON.stringify({ files }).slice(0, 150000) }, { role: "user", content: `npm build FAILED:\n${log}\n\nFix the error. Return the COMPLETE corrected files JSON.` });
                }
              }
              if (built && (project as any).backend_enabled) built = injectBackend(built, appOrigin(), project.id);
              const now = new Date().toISOString();
              const am: Msg = { role: "assistant", content: built ? "✅ React সাইট বিল্ড হয়েছে — রেডি" : `❌ বিল্ড হয়নি। শেষ ত্রুটি:\n${log.slice(-600)}`, at: now, mode: "build", id: mid(), ms: Date.now() - startedAt, coins: r2(chargedCoins), title: prompt.slice(0, 50), kind: built ? undefined : "build-error" };
              const newMsgs: Msg[] = [...history, userMsg(), am];
              const update: any = { messages: newMsgs, build_status: built ? "ready" : "failed", build_log: built ? "" : log };
              if (files) update.files = files;
              if (built) { update.code_html = built; if (project.is_published) update.changes_since_publish = ((project as any).changes_since_publish ?? 0) + 1; }
              if (project.name === "নতুন প্রজেক্ট" && !history.length) update.name = (planMsg ? shownPrompt : prompt).slice(0, 40);
              await db.from("projects").update(update).eq("id", project.id);
              send({ t: "done", tokens: rTokens, html: built, msg: am, used, limit, coins: r2(chargedCoins), balance: Math.max(0, coinsLeft), ms: am.ms });
              await finishSummary(newMsgs);
              return controller.close();
            }

            let html = "";
            let tokens = 0;
            let saved = 0;
            let baseHistory: Msg[] = history;

            // ---- Staged build (new site or resume): section by section with checkpoints ----
            if (resumeCp || !project.code_html) {
              let steps: Step[]; let done: Step[] = []; let partial = ""; let taskId: string;
              if (resumeCp) {
                done = (resumeCp.completed_steps as Step[]) ?? [];
                steps = [...done, ...((resumeCp.pending_steps as Step[]) ?? [])];
                partial = resumeCp.partial_html ?? "";
                taskId = resumeCp.task_id;
                baseHistory = history.map((m) => (m.kind === "paused" && m.checkpointId === resumeCp.id ? { ...m, resumed: true } : m));
                await db.from("task_checkpoints").update({ status: "resumed" }).eq("id", resumeCp.id);
              } else {
                // No separate outline call: steps are decided locally (1 step for simple sites, 2 grouped steps otherwise).
                baseHistory = [...history, userMsg()];
                const complex = !s2.single_pass_simple || (project as any).backend_enabled || imageParts.length > 0 || prompt.length >= 120;
                steps = complex
                  ? [
                      { id: "top", title: "হেডার, হিরো ও মূল অংশ", brief: "sticky navigation header with mobile menu, a premium animated hero, and the 2 most important content sections, each with full content depth" },
                      { id: "mid", title: "মাঝের অংশগুলো", brief: "2-3 rich middle sections (e.g. stats, process steps, showcase/gallery, pricing) with varied layouts and hover/scroll animations" },
                      { id: "rest", title: "রিভিউ, FAQ, যোগাযোগ ও ফুটার", brief: "testimonials, FAQ, a styled contact section/form, and a rich footer" },
                    ]
                  : [{ id: "all", title: "সম্পূর্ণ ওয়েবসাইট", brief: "the COMPLETE rich one-page site: sticky header/nav with mobile menu, premium animated hero, 6-8 detailed content sections (features, stats, process, showcase, testimonials, FAQ), contact, rich footer" }];
                taskId = mid();
              }
              const titles = steps.map((s) => s.title);
              const total = steps.length;
              const headOf = (h: string) => (h.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ").slice(0, 12000);
              let lastCp: string | null = resumeCp?.id ?? null;
              const savePause = async () => {
                const pct = Math.round((done.length / total) * 100);
                const { data: cp } = await db.from("task_checkpoints").insert({ project_id: project.id, user_id: user.id, task_id: taskId, progress_percent: pct, completed_steps: done, pending_steps: steps.slice(done.length), partial_html: partial, prompt, status: "paused" } as any).select("id").single();
                const pm: Msg = { role: "assistant", kind: "paused", content: `⏸️ ${pct}% সম্পূর্ণ — ${done.length}টি অংশ হয়েছে, ${total - done.length}টি বাকি`, at: new Date().toISOString(), mode: "build", id: mid(), ms: Date.now() - startedAt, coins: r2(chargedCoins), title: "কাজ থেমে আছে", checkpointId: cp?.id, percent: pct, doneTitles: done.map((s) => s.title), leftTitles: steps.slice(done.length).map((s) => s.title) };
                const msgs = [...baseHistory, pm];
                const upd: any = { messages: msgs };
                if (partial) upd.code_html = partial.replace(MARK, "");
                if (project.name === "নতুন প্রজেক্ট" && !history.length) upd.name = prompt.slice(0, 40);
                await db.from("projects").update(upd).eq("id", project.id);
                return pm;
              };
              for (let i = done.length; i < total; i++) {
                if (coinsLeft <= 0) {
                  const pm = await savePause();
                  send({ t: "paused", msg: pm, html: partial.replace(MARK, ""), balance: 0, coins: r2(chargedCoins), ms: Date.now() - startedAt, tokens });
                  return controller.close();
                }
                const s = steps[i];
                send({ t: "progress", step: `${s.title} বানাচ্ছি... (${i + 1}/${total})`, tokens, steps: titles, stepIndex: i });
                let r: { full: string; tokens: number } | null;
                if (!partial) {
                  const one = total === 1;
                  r = await run([
                    { role: "system", content: buildSystem + PREMIUM },
                    { role: "user", content: withExtra(one
                      ? `Website request: ${prompt}\n\nWrite the complete website in one HTML document: ${s.brief}.`
                      : `Website request: ${prompt}\n\nFull plan: ${steps.map((x) => x.brief).join("; ")}.\n\nNOW write the complete HTML document (head with all styles/fonts/scripts for the whole site) but include ONLY this part inside <body>: ${s.brief}. Put the exact comment ${MARK} where the remaining sections will be inserted (before the closing scripts/</body>).`) },
                  ], true);
                  if (r) { const h = extractHtml(r.full); if (/<body/i.test(h)) partial = h.includes(MARK) ? h : h.replace(/<\/body>/i, `${MARK}\n</body>`); }
                } else {
                  r = await run([
                    { role: "system", content: `You add sections to an existing Bangla website. Output ONLY the raw HTML fragment for the requested part (<section>/<footer> elements). No <html>/<head>/<body>, no markdown fences, no explanation. Reuse the existing CSS classes, colors and fonts from the given <head>. Bangla text, mobile-first. Match the hero polish: rich content, animations and hover effects.` + PREMIUM },
                    { role: "user", content: `Existing <head> (styles):\n${headOf(partial)}\n\nSections already built:\n${outline(partial.replace(MARK, ""))}\n\nWebsite request: ${prompt}\n\nNow write ONLY: ${s.brief}` },
                  ], true);
                  if (r) { const frag = cleanFrag(r.full); if (frag) partial = partial.includes(MARK) ? partial.replace(MARK, `${frag}\n${MARK}`) : partial.replace(/<\/body>/i, `${frag}\n</body>`); }
                }
                if (!r || !partial || sig.aborted) {
                  if (done.length || resumeCp) {
                    const pm = await savePause();
                    if (!sig.aborted) send({ t: "paused", msg: pm, html: partial.replace(MARK, ""), balance: Math.max(0, coinsLeft), coins: r2(chargedCoins), ms: Date.now() - startedAt, tokens, error: "AI সাড়া দেয়নি — চেকপয়েন্ট থেকে আবার চালু করুন" });
                  } else if (!sig.aborted) send({ t: "error", msg: "AI সঠিক ওয়েবসাইট দেয়নি। আবার চেষ্টা করুন।" });
                  return controller.close();
                }
                tokens += r.tokens; baseTokens = tokens;
                await charge(r.tokens, 0, `ওয়েবসাইট (${s.title}): ` + prompt.slice(0, 40));
                done.push(s);
                const pct = Math.round((done.length / total) * 100);
                const clean = partial.replace(MARK, "");
                const { data: cp } = await db.from("task_checkpoints").insert({ project_id: project.id, user_id: user.id, task_id: taskId, progress_percent: pct, completed_steps: done, pending_steps: steps.slice(done.length), partial_html: partial, prompt, status: done.length === total ? "done" : "running" } as any).select("id").single();
                lastCp = cp?.id ?? lastCp;
                await db.from("projects").update({ code_html: clean }).eq("id", project.id);
                send({ t: "checkpoint", id: lastCp, percent: pct, done: done.length, total, html: clean });
                // Background job: one step per request. Save progress, then start a fresh short request for the next step.
                if (job && done.length < total && !sig.aborted) {
                  const { data: ncp } = await db.from("task_checkpoints").insert({ project_id: project.id, user_id: user.id, task_id: taskId, progress_percent: pct, completed_steps: done, pending_steps: steps.slice(done.length), partial_html: partial, prompt, status: "paused" } as any).select("id").single();
                  if (ncp?.id) {
                    await db.from("projects").update({ messages: baseHistory, ...(project.name === "নতুন প্রজেক্ট" && !history.length ? { name: prompt.slice(0, 40) } : {}) }).eq("id", project.id);
                    await db.from("generation_jobs").update({ input: { ...(job.input as any), resumeId: ncp.id, mode: "build", chained: true }, attempts: 0 }).eq("id", job.id);
                    finalStatus = "running";
                    flushJob(); await chain;
                    const { data: st } = await db.from("generation_jobs").select("status").eq("id", job.id).maybeSingle();
                    if (st?.status !== "cancelled") await db.rpc("kick_job" as any, { _id: job.id } as any);
                    return controller.close();
                  }
                }
              }
              html = partial.replace(MARK, "");
            } else if (diffMessages) {
              send({ t: "notice-soft", msg: "শুধু পরিবর্তিত অংশ লেখা হচ্ছে..." });
              const r = await run(diffMessages, true);
              if (r) {
                tokens = r.tokens;
                baseTokens = tokens;
                const patched = applySections(project.code_html, r.full) ?? applyPatches(project.code_html, r.full);
                if (patched && /<\w+/.test(patched.html)) {
                  html = patched.html;
                  const fullCost = Math.ceil((JSON.stringify(fullMessages).length + project.code_html.length) / 4);
                  saved = Math.max(0, fullCost - tokens);
                } else {
                  send({ t: "notice", msg: "পুরো ওয়েবসাইট আবার লেখা হচ্ছে..." });
                }
              }
            }
            if (!html && !resumeCp && project.code_html) {
              const r = await run(fullMessages, true);
              if (!r && !tokens) { send({ t: "error", msg: "এই মুহূর্তে কোনো AI সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।" }); return controller.close(); }
              if (r) { tokens += r.tokens; html = extractHtml(r.full); }
            }
            if (!html || !/<\w+/.test(html)) {
              html = "";
              send({ t: "error", msg: "AI সঠিক ওয়েবসাইট দেয়নি। অন্যভাবে লিখে আবার চেষ্টা করুন।" });
            } else if (!isReact) {
              const { postProcessAssets } = await import("@/lib/assets.server");
              html = postProcessAssets(html);
              try {
                send({ t: "progress", step: "সাইট চেক করছি...", tokens });
                const { verifySite, reportText } = await import("@/lib/verify.server");
                const v = await verifySite(db, html, appOrigin());
                html = v.html;
                const { screenshotQa } = await import("@/lib/qa.server");
                const qa = await screenshotQa(db, usedProvider ?? ordered[0], html);
                if (qa) { tokens += qa.tokens; html = postProcessAssets(qa.html); v.report.qa = qa.summary || undefined; }
                verifyNote = reportText(v.report);
              } catch (e) { console.error("verify", e); }
            }

            const { data: kws } = await db.from("flag_keywords").select("keyword");
            const lower = html.toLowerCase();
            const hit = (kws ?? []).find((k) => lower.includes(k.keyword.toLowerCase()) || prompt.toLowerCase().includes(k.keyword.toLowerCase()));

            const now = new Date().toISOString();
            const unpaid = Math.max(0, tokens - Math.round(chargedCoins * tpc));
            const finalCoins = r2(chargedCoins + unpaid / tpc);
            const am: Msg = { role: "assistant", content: (html ? (resumeCp && !body.chained ? "▶️ বাকি অংশ শেষ — ওয়েবসাইট তৈরি হয়েছে" : saved ? "✓ ওয়েবসাইট আপডেট হয়েছে" : "✓ ওয়েবসাইট তৈরি হয়েছে") : "দুঃখিত, এবার হয়নি") + (html && verifyNote ? `\n\n${verifyNote}` : ""), at: now, mode: "build", id: mid(), ms: Date.now() - startedAt, coins: finalCoins, title: (planMsg ? "প্ল্যান অনুযায়ী বিল্ড" : prompt).slice(0, 50) };
            const newMsgs: Msg[] = [...(baseHistory === history ? [...history, userMsg()] : baseHistory), am];
            const update: any = { messages: newMsgs };
            if (html && (project as any).backend_enabled) html = injectBackend(html, appOrigin(), project.id);
            if (html) { update.code_html = html; if (project.is_published) update.changes_since_publish = ((project as any).changes_since_publish ?? 0) + 1; }
            if (hit) Object.assign(update, { is_flagged: true, flag_reason: `কীওয়ার্ড: ${hit.keyword}`, is_published: false });
            if (project.name === "নতুন প্রজেক্ট" && !history.length) update.name = (planMsg ? shownPrompt : prompt).slice(0, 40);

            await Promise.all([db.from("projects").update(update).eq("id", project.id), unpaid > 0 ? charge(unpaid, saved) : null]);
            const savedPct = saved ? Math.round((saved / (saved + tokens)) * 100) : 0;
            send({ t: "done", tokens, html, msg: am, used, limit, saved, savedPct, coins: finalCoins, balance: Math.max(0, coinsLeft), ms: am.ms });
            await finishSummary(newMsgs);
            controller.close();
            })().catch((e) => { console.error("job run", e); send({ t: "error", msg: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।" }); });
            } finally {
              flushJob(true);
              await chain;
              controller0.close();
            }
          },
        });

        return new Response(stream, {
          headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
