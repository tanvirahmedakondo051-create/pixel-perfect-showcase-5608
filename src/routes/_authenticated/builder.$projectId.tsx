import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Send, Monitor, Smartphone, Code2, Globe, Download, Eye, X, Zap, Loader2, Hexagon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bn, tokensToday, useProfile, useSession } from "@/lib/auth";
import { listActiveProviders, setPublished } from "@/lib/user.functions";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PREVIEW_MS } from "@/lib/hosting";

export const Route = createFileRoute("/_authenticated/builder/$projectId")({
  head: () => ({ meta: [{ title: "বিল্ডার — Hexa AI" }, { name: "description", content: "AI দিয়ে ওয়েবসাইট বানান।" }] }),
  component: Builder,
});

type Msg = { role: "user" | "assistant"; content: string; at?: string };
const chips = ["রেস্টুরেন্ট সাইট", "পোর্টফোলিও", "অনলাইন শপ", "বিয়ের দাওয়াত পেজ"];

function Builder() {
  const { projectId } = Route.useParams();
  const { user, session } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useProfile(user?.id);
  const fetchProviders = useServerFn(listActiveProviders);
  const publish = useServerFn(setPublished);
  const { data: providers } = useQuery({ queryKey: ["providers-public"], queryFn: () => fetchProviders() });
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [html, setHtml] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState("");
  const [providerId, setProviderId] = useState<string>("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showCode, setShowCode] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [usedOverride, setUsedOverride] = useState<number | null>(null);
  const [published, setPub] = useState<{ on: boolean; sub: string | null }>({ on: false, sub: null });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      setMessages((project.messages as Msg[]) ?? []);
      setHtml(project.code_html);
      setPub({ on: project.is_published, sub: project.subdomain });
    }
  }, [project]);
  useEffect(() => {
    if (providers?.length && !providerId) setProviderId(providers[0].id);
  }, [providers, providerId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, live]);
  useEffect(() => {
    taRef.current?.focus();
  }, []);
  const [previewOff, setPreviewOff] = useState(false);
  const [previewSession, setPreviewSession] = useState(0);
  useEffect(() => {
    setPreviewOff(false);
    const t = setTimeout(() => setPreviewOff(true), PREVIEW_MS);
    return () => clearTimeout(t);
  }, [html, previewSession]);

  const plan = profile?.plans as { tokens_per_day: number; can_download?: boolean; can_view_code?: boolean } | null;
  const canDownload = plan?.can_download !== false;
  const canCode = plan?.can_view_code !== false;
  const limit = plan?.tokens_per_day ?? 50000;
  const used = usedOverride ?? tokensToday(profile);
  const pct = Math.min(100, (used / limit) * 100);

  const autosize = () => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 180) + "px";
  };

  const send = async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || streaming) return;
    if (used >= limit) return toast.error("আজকের টোকেন শেষ! আগামীকাল আবার চেষ্টা করুন অথবা Pro নিন।");
    setInput("");
    setTimeout(autosize);
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setStreaming(true);
    setLive("");
    try {
      const res = await fetch("/api/public/generate", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId, prompt, providerId: providerId || null }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "কিছু একটা সমস্যা হয়েছে" }));
        toast.error(j.error);
        setMessages((m) => [...m, { role: "assistant", content: j.error }]);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.t === "delta") {
            acc += ev.c;
            setLive(acc);
          } else if (ev.t === "notice") toast.info(ev.msg);
          else if (ev.t === "error") toast.error(ev.msg);
          else if (ev.t === "done") {
            if (ev.html) {
              setHtml(ev.html);
              setMobilePreview(true);
            }
            setUsedOverride(ev.used);
            setMessages((m) => [...m, { role: "assistant", content: ev.html ? "✓ ওয়েবসাইট তৈরি হয়েছে" : "দুঃখিত, এবার হয়নি" }]);
            toast.success("সেভ হয়েছে ✓");
            qc.invalidateQueries({ queryKey: ["project", projectId] });
            qc.invalidateQueries({ queryKey: ["projects"] });
          }
        }
      }
    } catch {
      toast.error("সংযোগে সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setStreaming(false);
      setLive("");
      taRef.current?.focus();
    }
  };

  const download = () => {
    if (!html) return toast.error("এখনো কোনো ওয়েবসাইট নেই");
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(project?.name || "website").replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doPublish = async () => {
    const r = await publish({ data: { id: projectId, publish: !published.on } });
    if ("error" in r) return toast.error(r.error);
    setPub({ on: !published.on, sub: r.subdomain ?? null });
    if (!published.on && r.subdomain) {
      const url = `${window.location.origin}/s/${r.subdomain}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("প্রকাশিত হয়েছে! লিংক কপি করা হয়েছে।");
    } else toast.success("প্রকাশ বন্ধ করা হয়েছে");
  };

  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-cyan" /></div>;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background/60 p-2">
      <div className="flex rounded-lg bg-muted p-1">
        <button onClick={() => { setDevice("desktop"); setShowCode(false); }} className={`grid size-10 place-items-center rounded-md ${device === "desktop" && !showCode ? "bg-primary" : ""}`} aria-label="ডেস্কটপ"><Monitor className="size-4" /></button>
        <button onClick={() => { setDevice("mobile"); setShowCode(false); }} className={`grid size-10 place-items-center rounded-md ${device === "mobile" && !showCode ? "bg-primary" : ""}`} aria-label="মোবাইল"><Smartphone className="size-4" /></button>
        {canCode && <button onClick={() => setShowCode(!showCode)} className={`grid size-10 place-items-center rounded-md ${showCode ? "bg-primary" : ""}`} aria-label="কোড"><Code2 className="size-4" /></button>}
      </div>
      <div className="ml-auto flex gap-1">
        {canDownload && <button onClick={download} className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm hover:bg-accent"><Download className="size-4" /><span className="hidden sm:inline">ডাউনলোড</span></button>}
        <button onClick={doPublish} className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${published.on ? "border border-success/50 text-success" : "bg-brand"}`}>
          <Globe className="size-4" />{published.on ? "প্রকাশিত" : "প্রকাশ করুন"}
        </button>
        <button onClick={() => setMobilePreview(false)} className="grid size-11 place-items-center rounded-lg hover:bg-accent md:hidden" aria-label="বন্ধ করুন"><X /></button>
      </div>
    </div>
  );

  const preview = (
    <div className="flex h-full flex-col">
      {toolbar}
      {published.on && published.sub && (
        <a href={`/s/${published.sub}`} target="_blank" rel="noreferrer" className="truncate border-b border-border px-3 py-1.5 font-en text-xs text-cyan">/s/{published.sub}</a>
      )}
      <div className="relative flex-1 overflow-hidden bg-muted/30">
        {streaming ? (
          <div className="h-full overflow-auto p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-cyan"><Loader2 className="size-4 animate-spin" /> ওয়েবসাইট তৈরি হচ্ছে...</div>
            {live ? (
              <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">{live.slice(-3000)}</pre>
            ) : (
              <div className="space-y-3">{[40, 70, 100, 85, 60].map((w, i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}</div>
            )}
          </div>
        ) : showCode && canCode ? (
          <pre className="h-full overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs">{html || "<!-- এখনো কোনো কোড নেই -->"}</pre>
        ) : html && previewOff ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <Eye className="mx-auto mb-3 size-10 opacity-40" />
              <p className="font-semibold">প্রিভিউ বন্ধ হয়েছে</p>
              <p className="mt-1 text-sm text-muted-foreground">৫ মিনিট কোনো কাজ না হওয়ায় প্রিভিউ বন্ধ করা হয়েছে।</p>
              <button onClick={() => setPreviewSession((n) => n + 1)} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-brand px-5 font-semibold text-primary-foreground">রিফ্রেশ করুন</button>
            </div>
          </div>
        ) : html ? (
          <div className="flex h-full justify-center p-0 md:p-4">
            <iframe title="প্রিভিউ" srcDoc={html} sandbox="allow-scripts allow-forms allow-popups" className={`h-full border-0 bg-white ${device === "mobile" ? "w-[375px] max-w-full rounded-xl md:shadow-glow" : "w-full md:rounded-xl"}`} />
          </div>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-muted-foreground">
            <div><Eye className="mx-auto mb-3 size-10 opacity-40" />বামে লিখুন কী চান — এখানে ওয়েবসাইট দেখা যাবে</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2">
        <Link to="/dashboard" className="grid size-11 place-items-center rounded-lg hover:bg-accent" aria-label="ফিরে যান"><ArrowRight className="size-5" /></Link>
        <span className="grid size-8 place-items-center rounded-lg bg-brand"><Hexagon className="size-4" /></span>
        <h1 className="line-clamp-1 flex-1 font-semibold">{project?.name}</h1>
        {!!providers?.length && providers.length > 1 && (
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger className="h-10 w-32 sm:w-44"><SelectValue placeholder="AI" /></SelectTrigger>
            <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[380px_1fr] lg:grid-cols-[420px_1fr]">
        <section className="flex min-h-0 flex-col border-border md:border-r">
          <div className="border-b border-border px-4 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground"><Zap className="size-3 text-cyan" /> আজ {bn(used)} / {bn(limit)} টোকেন</span>
              {pct >= 90 && <Link to="/pricing" className="text-cyan">Pro নিন</Link>}
            </div>
            <Progress value={pct} className={`mt-1.5 h-1.5 ${pct >= 90 ? "[&>div]:bg-destructive" : "[&>div]:bg-cyan"}`} />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!messages.length && (
              <div className="pt-6 text-center">
                <h2 className="text-xl font-semibold">কী ধরনের ওয়েবসাইট চান?</h2>
                <p className="mt-1 text-sm text-muted-foreground">বাংলায় লিখুন, অথবা নিচের একটি বেছে নিন</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {chips.map((c) => (
                    <button key={c} onClick={() => send(`একটা সুন্দর ${c} বানাও`)} className="glass min-h-12 rounded-full px-4 text-sm hover:border-primary">{c}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "ml-auto rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"}`}>
                {m.content}
                {m.role === "assistant" && m.content.startsWith("✓") && i === messages.length - 1 && html && (
                  <button onClick={() => setMobilePreview(true)} className="mt-2 flex min-h-10 items-center gap-1 text-cyan md:hidden"><Eye className="size-4" /> প্রিভিউ দেখুন</button>
                )}
              </div>
            ))}
            {streaming && (
              <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm">
                <Loader2 className="size-4 animate-spin text-cyan" /> লিখছে...
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 focus-within:border-cyan">
              <textarea
                ref={taRef}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); autosize(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
                }}
                placeholder="যেমন: আমার কাপড়ের দোকানের ওয়েবসাইট বানাও..."
                className="max-h-44 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => send()} disabled={streaming || !input.trim()} className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand disabled:opacity-40" aria-label="পাঠান">
                {streaming ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              </button>
            </div>
            <p className="mt-1 hidden text-center text-[11px] text-muted-foreground md:block">Ctrl+Enter চেপে পাঠান</p>
          </div>
        </section>

        <section className="hidden min-h-0 md:block">{preview}</section>
      </div>

      {mobilePreview && <div className="fixed inset-0 z-50 bg-background md:hidden animate-in slide-in-from-right duration-300">{preview}</div>}
      {html && !mobilePreview && !streaming && (
        <button onClick={() => setMobilePreview(true)} className="fixed bottom-28 left-1/2 z-30 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 font-semibold shadow-glow md:hidden">
          <Eye className="size-4" /> প্রিভিউ
        </button>
      )}
    </div>
  );
}
