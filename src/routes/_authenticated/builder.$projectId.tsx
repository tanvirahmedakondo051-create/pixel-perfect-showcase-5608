import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
const AssetPanel = lazy(() => import("@/components/app/AssetPanel"));
import { toast } from "sonner";
import { ArrowRight, Send, Monitor, Smartphone, Code2, Globe, Download, Eye, X, Zap, Loader2, Hexagon, Link2, Github, RefreshCw, History, ClipboardList, Hammer, CheckCircle2, Paperclip, Palette, FileText, Server } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { uploadChatFile } from "@/lib/upload.functions";
import { GithubDialog } from "@/components/app/GithubDialog";
import { VersionsDialog } from "@/components/app/VersionsDialog";
import { liveUpdate } from "@/lib/publish.functions";
import { DomainDialog } from "@/components/app/DomainDialog";
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

type Att = { path: string; url: string; name: string; type: string };
type Msg = { role: "user" | "assistant"; content: string; at?: string; mode?: "plan" | "build"; files?: { name: string; url: string; type: string }[] };
const LINK_RE = /https?:\/\/[^\s<>"']+|www\.[a-z0-9-]+\.[a-z]{2,}[^\s<>"']*/i;
const OPT_RE = /\[\[(.+?)\]\]/g;
const chips = ["রেস্টুরেন্ট সাইট", "পোর্টফোলিও", "অনলাইন শপ", "বিয়ের দাওয়াত পেজ"];

function Builder() {
  const { projectId } = Route.useParams();
  const { user, session } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useProfile(user?.id);
  const fetchProviders = useServerFn(listActiveProviders);
  const publish = useServerFn(setPublished);
  const doLive = useServerFn(liveUpdate);
  useEffect(() => {
    const ch = supabase.channel(`project-${projectId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${projectId}` }, () => qc.invalidateQueries({ queryKey: ["project", projectId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);
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
  const [domainOpen, setDomainOpen] = useState(false);
  const [atts, setAtts] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadChatFile);
  const [mode, setMode] = useState<"plan" | "build">("build");
  const [lastSaved, setLastSaved] = useState(0);
  const [ghOpen, setGhOpen] = useState(false);
  const [verOpen, setVerOpen] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
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

  const plan = profile?.plans as { tokens_per_day: number; can_download?: boolean; can_view_code?: boolean; allow_custom_domain?: boolean } | null;
  const canDomain = !!plan?.allow_custom_domain;
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

  const send = async (text?: string, modeOverride?: "plan" | "build") => {
    const m0 = modeOverride ?? mode;
    const prompt = (text ?? input).trim();
    if ((!prompt && !atts.length) || streaming || uploading) return;
    const files = atts;
    if (used >= limit) return toast.error("আজকের টোকেন শেষ! আগামীকাল আবার চেষ্টা করুন অথবা Pro নিন।");
    setInput("");
    setTimeout(autosize);
    setAtts([]);
    const text0 = prompt || "এই ফাইলগুলো ওয়েবসাইটে ব্যবহার করো";
    setMessages((m) => [...m, { role: "user", content: text0, mode: m0, files: files.map((f) => ({ name: f.name, url: f.url, type: f.type })) }]);
    setStreaming(true);
    setLive("");
    try {
      const res = await fetch("/api/public/generate", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId, prompt: text0, providerId: providerId || null, mode: m0, attachments: files }),
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
          } else if (ev.t === "notice") { toast.info(ev.msg); acc = ""; setLive(""); }
          else if (ev.t === "error") toast.error(ev.msg);
          else if (ev.t === "done") {
            if (ev.html) {
              setHtml(ev.html);
              setMobilePreview(true);
            }
            setUsedOverride(ev.used);
            if (ev.savedPct) { setLastSaved(ev.savedPct); toast.success(`${bn(ev.savedPct)}% টোকেন সেভ 🎉`); }
            if (m0 === "plan") {
              setMessages((m) => [...m, { role: "assistant", content: ev.plan || "", mode: "plan" }]);
            } else {
              setMessages((m) => [...m, { role: "assistant", content: ev.html ? "✓ ওয়েবসাইট তৈরি হয়েছে" : "দুঃখিত, এবার হয়নি", mode: "build" }]);
              toast.success("সেভ হয়েছে ✓");
            }
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

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const picked = [...list].slice(0, 4 - atts.length);
    if (!picked.length) return toast.error("একবারে সর্বোচ্চ ৪টি ফাইল");
    setUploading(true);
    try {
      for (const f of picked) {
        if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name}: ৫MB এর বেশি`); continue; }
        const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(f); });
        const r = await upload({ data: { projectId, name: f.name, type: f.type || "application/octet-stream", data } });
        if ("error" in r) { toast.error(r.error); continue; }
        setAtts((a) => [...a, { path: r.path, url: r.url, name: r.name, type: r.type }]);
      }
    } catch { toast.error("আপলোড করা যায়নি"); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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

  const approvePlan = (planText: string) => {
    setMode("build");
    send(`এই অনুমোদিত প্ল্যান অনুযায়ী সম্পূর্ণ ওয়েবসাইট বানাও:\n\n${planText.replace(OPT_RE, "").trim()}`, "build");
  };

  const runLive = async () => {
    setLiveBusy(true);
    try {
      const r = await doLive({ data: { id: projectId } });
      if ("error" in r) return toast.error(r.error);
      toast.success("✅ লাইভ আপডেট হয়েছে!", { description: r.changelog });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["versions", projectId] });
    } catch { toast.error("লাইভ আপডেট করা যায়নি"); } finally { setLiveBusy(false); }
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

  const changes = (project as any)?.changes_since_publish ?? 0;
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-cyan" /></div>;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background/60 p-2">
      <div className="flex rounded-lg bg-muted p-1">
        <button onClick={() => { setDevice("desktop"); setShowCode(false); }} className={`grid size-10 place-items-center rounded-md ${device === "desktop" && !showCode ? "bg-primary" : ""}`} aria-label="ডেস্কটপ"><Monitor className="size-4" /></button>
        <button onClick={() => { setDevice("mobile"); setShowCode(false); }} className={`grid size-10 place-items-center rounded-md ${device === "mobile" && !showCode ? "bg-primary" : ""}`} aria-label="মোবাইল"><Smartphone className="size-4" /></button>
        {canCode && <button onClick={() => setShowCode(!showCode)} className={`grid size-10 place-items-center rounded-md ${showCode ? "bg-primary" : ""}`} aria-label="কোড"><Code2 className="size-4" /></button>}
      </div>
      <div className="ml-auto flex flex-wrap justify-end gap-1">
        <button onClick={() => setGhOpen(true)} className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm hover:bg-accent" aria-label="GitHub"><Github className="size-4" /><span className="hidden sm:inline">GitHub</span></button>
        {published.on && <button onClick={() => setVerOpen(true)} className="grid size-11 place-items-center rounded-lg hover:bg-accent" aria-label="ভার্সন ইতিহাস"><History className="size-4" /></button>}
        {published.on && changes > 0 && (
          <button onClick={runLive} disabled={liveBusy || streaming} className="relative flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold disabled:opacity-60">
            {liveBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}লাইভ আপডেট
            <span className="rounded-full bg-background/30 px-1.5 text-[11px]">{bn(changes)} টি চেঞ্জ</span>
          </button>
        )}
        {canDownload && <button onClick={download} className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm hover:bg-accent"><Download className="size-4" /><span className="hidden sm:inline">ডাউনলোড</span></button>}
        {canDomain && (
          <button onClick={() => setDomainOpen(true)} className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm hover:bg-accent" aria-label="কাস্টম ডোমেইন">
            <Link2 className="size-4" /><span className="hidden sm:inline">ডোমেইন</span>
          </button>
        )}
        <button onClick={published.on ? () => setVerOpen(true) : doPublish} className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${published.on ? "border border-success/50 text-success" : "bg-brand"}`}>
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
      {project && (
        <>
          <GithubDialog open={ghOpen} onOpenChange={setGhOpen} projectId={projectId} projectName={project.name} onImported={(h) => { setHtml(h); qc.invalidateQueries({ queryKey: ["project", projectId] }); }} />
          <VersionsDialog open={verOpen} onOpenChange={setVerOpen} projectId={projectId} current={(project as any).published_version ?? 0} published={published.on} onRolledBack={(h) => setHtml(h)} onUnpublish={doPublish} />
        </>
      )}
      {project && canDomain && (
        <DomainDialog open={domainOpen} onOpenChange={setDomainOpen} project={project as any} onChanged={() => qc.invalidateQueries({ queryKey: ["project", projectId] })} />
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
              {lastSaved > 0 && <span className="text-success">{bn(lastSaved)}% সেভ 🎉</span>}
              {pct >= 90 && <Link to="/pricing" className="text-cyan">Pro নিন</Link>}
            </div>
            <Progress value={pct} className={`mt-1.5 h-1.5 ${pct >= 90 ? "[&>div]:bg-destructive" : "[&>div]:bg-cyan"}`} />
          </div>

          <div className={`border-b border-border px-2 py-2`}>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="মোড">
              <button onClick={() => setMode("plan")} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm ${mode === "plan" ? "bg-cyan/20 text-cyan" : ""}`}><ClipboardList className="size-4" /> প্ল্যান</button>
              <button onClick={() => setMode("build")} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm ${mode === "build" ? "bg-primary text-primary-foreground" : ""}`}><Hammer className="size-4" /> বিল্ড</button>
            </div>
            {mode === "plan" && <p className="mt-1.5 text-center text-[11px] text-muted-foreground">প্ল্যান মোডে AI আলোচনা করবে, ওয়েবসাইট বদলাবে না</p>}
          </div>
          <div className={`flex-1 space-y-3 overflow-y-auto p-4`}>
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
                {m.mode === "plan" && m.role === "assistant" ? (
                  <>
                    <div className="whitespace-pre-line">{m.content.replace(OPT_RE, "").replace(/\n{3,}/g, "\n\n").trim()}</div>
                    {i === messages.length - 1 && !streaming && [...m.content.matchAll(OPT_RE)].length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[...m.content.matchAll(OPT_RE)].map((x, k) => (
                          <button key={k} onClick={() => send(x[1], "plan")} className="min-h-10 rounded-full border border-cyan/50 px-3 text-xs text-cyan hover:bg-cyan/10">{x[1]}</button>
                        ))}
                      </div>
                    )}
                    {i === messages.length - 1 && !streaming && /অনুমোদন|\n\s*\d+[.)]/.test(m.content) && (
                      <button onClick={() => approvePlan(m.content)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand font-semibold text-primary-foreground"><CheckCircle2 className="size-4" /> অনুমোদন করে বিল্ড করুন</button>
                    )}
                  </>
                ) : <span className="whitespace-pre-line">{m.content}</span>}
                {!!m.files?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.files.map((f, k) => f.type.startsWith("image/")
                      ? <img key={k} src={f.url} alt={f.name} loading="lazy" className="size-16 rounded-lg object-cover" />
                      : <span key={k} className="flex items-center gap-1 rounded-lg bg-background/30 px-2 py-1 text-xs"><FileText className="size-3" />{f.name}</span>)}
                  </div>
                )}
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

          <div className={`border-t border-border bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`}>
            {(!!atts.length || uploading) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {atts.map((a, i) => (
                  <div key={a.path} className="relative">
                    {a.type.startsWith("image/") ? <img src={a.url} alt={a.name} className="size-14 rounded-lg object-cover" /> : <span className="flex h-14 items-center gap-1 rounded-lg bg-muted px-2 text-xs"><FileText className="size-4" />{a.name.slice(0, 14)}</span>}
                    <button onClick={() => setAtts((x) => x.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground" aria-label="সরান"><X className="size-3" /></button>
                  </div>
                ))}
                {uploading && <div className="grid size-14 place-items-center rounded-lg bg-muted"><Loader2 className="size-4 animate-spin text-cyan" /></div>}
              </div>
            )}
            {LINK_RE.test(input) && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-cyan"><Link2 className="size-3" /> লিংকটি AI নিজে খুলে ডিজাইন বিশ্লেষণ করবে</p>
            )}
            <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <div className="flex items-end gap-1 rounded-2xl border border-input bg-card p-2 focus-within:border-cyan">
              <button onClick={() => fileRef.current?.click()} disabled={uploading || atts.length >= 4} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" aria-label="ফাইল যোগ করুন"><Paperclip className="size-5" /></button>
              <Popover open={assetOpen} onOpenChange={setAssetOpen}>
                <PopoverTrigger asChild>
                  <button className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="অ্যাসেট"><Palette className="size-5" /></button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="h-[min(70dvh,520px)] w-[min(92vw,420px)] overflow-hidden p-0">
                  {assetOpen && (
                    <Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-cyan" /></div>}>
                      <AssetPanel onPick={(t) => { setInput((v) => (v ? v + "\n" : "") + t); setAssetOpen(false); toast.success("অ্যাসেট বার্তায় যোগ হয়েছে"); setTimeout(autosize); }} />
                    </Suspense>
                  )}
                </PopoverContent>
              </Popover>
              <textarea
                ref={taRef}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); autosize(); }}
                onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); onFiles(e.clipboardData.files); } }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
                }}
                placeholder={mode === "plan" ? "কী ধরনের সাইট চান, আলোচনা শুরু করুন..." : "যেমন: আমার কাপড়ের দোকানের ওয়েবসাইট বানাও..."}
                className="max-h-44 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => send()} disabled={streaming || uploading || (!input.trim() && !atts.length)} className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand disabled:opacity-40" aria-label="পাঠান">
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
