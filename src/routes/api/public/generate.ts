import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1).max(8000),
  providerId: z.string().uuid().optional().nullable(),
});

type Msg = { role: "user" | "assistant"; content: string; at: string };

function dhakaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

function extractHtml(text: string) {
  const fence = text.match(/```(?:html)?\s*([\s\S]*?)(```|$)/i);
  let html = fence ? fence[1] : text;
  const start = html.search(/<!doctype html|<html/i);
  if (start > 0) html = html.slice(start);
  const end = html.toLowerCase().lastIndexOf("</html>");
  if (end > 0) html = html.slice(0, end + 7);
  return html.trim();
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/public/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json(401, "লগইন করুন");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: u } = await db.auth.getUser(token);
        const user = u?.user;
        if (!user) return json(401, "লগইন সেশন শেষ, আবার লগইন করুন");

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return json(400, "অনুরোধটি সঠিক নয়");
        }

        const [{ data: profile }, { data: settings }, { data: project }] = await Promise.all([
          db.from("profiles").select("*, plans(*)").eq("id", user.id).single(),
          db.from("site_settings").select("*").eq("id", 1).single(),
          db.from("projects").select("*").eq("id", body.projectId).single(),
        ]);
        if (!profile || !settings) return json(500, "সার্ভারে সমস্যা হয়েছে");
        if (!project || project.user_id !== user.id) return json(404, "প্রজেক্ট পাওয়া যায়নি");
        if (profile.is_banned) return json(403, "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে");
        if (settings.require_email_verify && !user.email_confirmed_at) return json(403, "আগে ইমেইল ভেরিফাই করুন");

        const today = dhakaToday();
        let used = profile.tokens_used_today;
        if (profile.last_reset_date < today) {
          used = 0;
          await db.from("profiles").update({ tokens_used_today: 0, last_reset_date: today }).eq("id", user.id);
        }
        const limit = (profile.plans as any)?.tokens_per_day ?? 50000;
        if (used >= limit) return json(429, "আজকের টোকেন শেষ! আগামীকাল আবার চেষ্টা করুন অথবা Pro নিন।");

        const since = new Date(Date.now() - 60_000).toISOString();
        const { count: recent } = await db.from("usage_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
        if ((recent ?? 0) >= settings.rate_limit_per_minute) return json(429, "খুব দ্রুত অনুরোধ করছেন। এক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।");

        const { data: providers } = await db.from("ai_providers").select("*").eq("is_active", true).order("is_default", { ascending: false }).order("sort_order");
        if (!providers?.length) return json(503, "এখনো কোনো AI সংযুক্ত করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।");
        const ordered = body.providerId
          ? [...providers.filter((p) => p.id === body.providerId), ...providers.filter((p) => p.id !== body.providerId)]
          : providers;

        const history = (project.messages as Msg[]) ?? [];
        const userContent = project.code_html
          ? `এই ওয়েবসাইটটি আছে:\n\`\`\`html\n${project.code_html}\n\`\`\`\n\nপরিবর্তনের অনুরোধ: ${body.prompt}\n\nসম্পূর্ণ আপডেট করা HTML ফাইলটি দিন।`
          : body.prompt;
        const messages = [
          { role: "system", content: settings.system_prompt },
          ...history.filter((m) => m.role === "user").slice(-4).map((m) => ({ role: "user", content: m.content })),
          { role: "user", content: userContent },
        ];

        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (o: object) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
            let res: Response | null = null;
            let usedProvider: (typeof ordered)[number] | null = null;
            for (let i = 0; i < ordered.length; i++) {
              const p = ordered[i];
              if (i > 0) send({ t: "notice", msg: "মূল AI ব্যস্ত, বিকল্প ব্যবহার করা হচ্ছে..." });
              try {
                const r = await fetch(p.base_url.replace(/\/+$/, "") + "/chat/completions", {
                  method: "POST",
                  signal: request.signal,
                  headers: {
                    Authorization: `Bearer ${p.api_key}`,
                    "Content-Type": "application/json",
                    ...((p.custom_headers as Record<string, string>) ?? {}),
                  },
                  body: JSON.stringify({
                    model: p.model,
                    messages,
                    stream: true,
                    stream_options: { include_usage: true },
                    max_tokens: Math.min(p.max_tokens, settings.max_output_tokens),
                    temperature: p.temperature,
                  }),
                });
                if (r.ok && r.body) {
                  res = r;
                  usedProvider = p;
                  break;
                }
                console.error("provider failed", p.name, r.status, (await r.text()).slice(0, 300));
              } catch (e) {
                if (request.signal.aborted) return controller.close();
                console.error("provider error", p.name, e);
              }
            }
            if (!res || !usedProvider) {
              send({ t: "error", msg: "এই মুহূর্তে কোনো AI সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।" });
              return controller.close();
            }

            let full = "";
            let tokens = 0;
            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            let buf = "";
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
                      send({ t: "delta", c });
                    }
                    if (j.usage?.total_tokens) tokens = j.usage.total_tokens;
                  } catch {
                    /* partial line */
                  }
                }
              }
            } catch (e) {
              if (!request.signal.aborted) console.error("stream read", e);
            }

            if (!tokens) tokens = Math.ceil((JSON.stringify(messages).length + full.length) / 4);
            const html = extractHtml(full);
            if (!html || !/<\w+/.test(html)) {
              send({ t: "error", msg: "AI সঠিক ওয়েবসাইট দেয়নি। অন্যভাবে লিখে আবার চেষ্টা করুন।" });
            }

            const { data: kws } = await db.from("flag_keywords").select("keyword");
            const lower = html.toLowerCase();
            const hit = (kws ?? []).find((k) => lower.includes(k.keyword.toLowerCase()) || body.prompt.toLowerCase().includes(k.keyword.toLowerCase()));

            const now = new Date().toISOString();
            const newMsgs: Msg[] = [
              ...history,
              { role: "user", content: body.prompt, at: now },
              { role: "assistant", content: html ? "✓ ওয়েবসাইট তৈরি হয়েছে" : "দুঃখিত, এবার হয়নি", at: now },
            ];
            const update: Record<string, any> = { messages: newMsgs };
            if (html) update.code_html = html;
            if (hit) Object.assign(update, { is_flagged: true, flag_reason: `কীওয়ার্ড: ${hit.keyword}`, is_published: false });
            if (project.name === "নতুন প্রজেক্ট" && !history.length) update.name = body.prompt.slice(0, 40);

            await Promise.all([
              db.from("projects").update(update).eq("id", project.id),
              db.from("usage_logs").insert({ user_id: user.id, tokens_used: tokens, provider_name: usedProvider.name }),
              db.from("profiles").update({ tokens_used_today: used + tokens, last_reset_date: today }).eq("id", user.id),
            ]);
            send({ t: "done", tokens, html, used: used + tokens, limit });
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
