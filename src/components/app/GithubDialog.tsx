import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Github, ExternalLink, GitCommit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { githubStatus, startGithubConnect, completeGithubConnect, disconnectGithub, listGithubRepos, pushToGithub, importFromGithub, listGithubCommits } from "@/lib/github.functions";
import { bnDate } from "@/lib/auth";

const inp = "min-h-12 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus:border-cyan";
const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-50";

function waitForCode(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      const t = e.data?.type;
      if (e.origin !== window.location.origin || e.source !== popup || e.data?.connectorId !== "github") return;
      if (t !== "appUserConnectorOAuthComplete" && t !== "appUserConnectorOAuthFailed") return;
      cleanup();
      if (t === "appUserConnectorOAuthComplete") resolve(typeof e.data.code === "string" ? e.data.code : null);
      else reject(new Error("failed"));
    };
    const poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("closed")); } }, 500);
    const cleanup = () => { window.removeEventListener("message", onMsg); window.clearInterval(poll); };
    window.addEventListener("message", onMsg);
  });
}

export function GithubDialog({ open, onOpenChange, projectId, projectName, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; projectName: string; onImported: (html: string) => void }) {
  const qc = useQueryClient();
  const status = useServerFn(githubStatus);
  const start = useServerFn(startGithubConnect);
  const complete = useServerFn(completeGithubConnect);
  const disc = useServerFn(disconnectGithub);
  const repos = useServerFn(listGithubRepos);
  const push = useServerFn(pushToGithub);
  const imp = useServerFn(importFromGithub);
  const commits = useServerFn(listGithubCommits);

  const { data: st, isLoading } = useQuery({ queryKey: ["gh-status"], queryFn: () => status(), enabled: open });
  const [tab, setTab] = useState<"push" | "import" | "history">("push");
  const [busy, setBusy] = useState(false);
  const slug = (projectName || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hexa-site";
  const [repo, setRepo] = useState(slug);
  const [priv, setPriv] = useState(false);
  const [msg, setMsg] = useState("Hexa AI থেকে আপডেট");
  const [impMode, setImpMode] = useState<"mine" | "link">("mine");
  const [pick, setPick] = useState("");
  const [link, setLink] = useState("");
  useEffect(() => { if (open) setRepo(slug); }, [open, slug]);

  const connected = st?.connected;
  const { data: repoList } = useQuery({ queryKey: ["gh-repos"], queryFn: () => repos(), enabled: open && !!connected && tab === "import" && impMode === "mine" });
  const { data: hist, isLoading: histLoading } = useQuery({ queryKey: ["gh-commits", projectId], queryFn: () => commits({ data: { projectId } }), enabled: open && !!connected && tab === "history" });

  const connect = async () => {
    const popup = window.open("", "hexa-github", "width=600,height=720");
    if (!popup) return toast.error("পপআপ ব্লক হয়েছে, অনুমতি দিয়ে আবার চেষ্টা করুন");
    setBusy(true);
    try {
      const { authorizationUrl } = await start();
      const wait = waitForCode(popup);
      popup.location.href = authorizationUrl;
      const code = await wait;
      if (code) await complete({ data: { code } });
      await qc.invalidateQueries({ queryKey: ["gh-status"] });
      toast.success("GitHub সংযুক্ত হয়েছে ✓");
    } catch {
      popup.close();
      toast.error("GitHub সংযোগ সম্পন্ন হয়নি");
    } finally { setBusy(false); }
  };

  const doPush = async () => {
    setBusy(true);
    try {
      const r = await push({ data: { projectId, repo: repo.trim(), isPrivate: priv, message: msg.trim() || "আপডেট" } });
      if ("error" in r) return toast.error(r.error);
      toast.success(<span>আপলোড হয়েছে! <a className="underline" href={r.url} target="_blank" rel="noreferrer">রিপো দেখুন</a></span>);
      qc.invalidateQueries({ queryKey: ["gh-commits", projectId] });
    } catch { toast.error("আপলোড করা যায়নি"); } finally { setBusy(false); }
  };

  const doImport = async () => {
    const target = impMode === "mine" ? pick : link;
    if (!target) return toast.error(impMode === "mine" ? "একটি রিপো বেছে নিন" : "লিংক দিন");
    setBusy(true);
    try {
      const r = await imp({ data: { projectId, repo: target } });
      if ("error" in r) return toast.error(r.error);
      onImported(r.html);
      toast.success("ইমপোর্ট হয়েছে! এখন চ্যাটে পরিবর্তন চাইতে পারেন।");
      onOpenChange(false);
    } catch { toast.error("ইমপোর্ট করা যায়নি"); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Github className="size-5" /> GitHub</DialogTitle></DialogHeader>
        {isLoading ? <Loader2 className="mx-auto size-6 animate-spin text-cyan" /> : !connected ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">আপনার GitHub অ্যাকাউন্ট যুক্ত করুন — তারপর ওয়েবসাইট আপলোড বা ইমপোর্ট করতে পারবেন।</p>
            <button disabled={busy} onClick={connect} className={`${btn} w-full bg-brand`}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />} GitHub এ লগইন করুন</button>
            <p className="text-sm text-muted-foreground">অথবা যেকোনো পাবলিক রিপো থেকে ইমপোর্ট করুন:</p>
            <div className="flex gap-2">
              <input className={inp} placeholder="github.com/user/repo" value={link} onChange={(e) => { setLink(e.target.value); setImpMode("link"); }} />
              <button disabled={busy} onClick={() => { setImpMode("link"); doImport(); }} className={`${btn} border border-border`}>ইমপোর্ট</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              {st.avatar && <img src={st.avatar} alt="" className="size-10 rounded-full" />}
              <span className="flex-1 font-en font-semibold">@{st.username}</span>
              <button onClick={async () => { await disc(); qc.invalidateQueries({ queryKey: ["gh-status"] }); toast.success("সংযোগ বিচ্ছিন্ন হয়েছে"); }} className="min-h-11 px-2 text-sm text-destructive">বিচ্ছিন্ন করুন</button>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {([["push", "আপলোড"], ["import", "ইমপোর্ট"], ["history", "কমিট"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={`min-h-11 rounded-lg text-sm ${tab === k ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
              ))}
            </div>
            {tab === "push" && (
              <div className="space-y-3">
                <label className="block text-sm">রিপোর নাম<input className={`${inp} mt-1 font-en`} value={repo} onChange={(e) => setRepo(e.target.value.replace(/[^A-Za-z0-9._-]/g, "-"))} /></label>
                <div className="grid grid-cols-2 gap-2">
                  {[[false, "পাবলিক"], [true, "প্রাইভেট"]].map(([v, l]) => (
                    <button key={String(v)} onClick={() => setPriv(v as boolean)} className={`min-h-12 rounded-xl border ${priv === v ? "border-cyan text-cyan" : "border-border"}`}>{l as string}</button>
                  ))}
                </div>
                <label className="block text-sm">কমিট মেসেজ<input className={`${inp} mt-1`} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
                <button disabled={busy || !repo} onClick={doPush} className={`${btn} w-full bg-brand`}>{busy && <Loader2 className="size-4 animate-spin" />} GitHub এ আপলোড</button>
              </div>
            )}
            {tab === "import" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setImpMode("mine")} className={`min-h-11 rounded-xl border ${impMode === "mine" ? "border-cyan text-cyan" : "border-border"}`}>আমার রিপো</button>
                  <button onClick={() => setImpMode("link")} className={`min-h-11 rounded-xl border ${impMode === "link" ? "border-cyan text-cyan" : "border-border"}`}>লিংক</button>
                </div>
                {impMode === "mine" ? (
                  repoList && "error" in repoList ? <p className="text-sm text-destructive">{repoList.error}</p> : (
                    <Select value={pick} onValueChange={setPick}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={repoList ? "রিপো বেছে নিন" : "লোড হচ্ছে..."} /></SelectTrigger>
                      <SelectContent>{repoList?.repos?.map((r) => <SelectItem key={r.full_name} value={r.full_name}><span className="font-en">{r.full_name}</span>{r.private ? " 🔒" : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  )
                ) : <input className={`${inp} font-en`} placeholder="https://github.com/user/repo" value={link} onChange={(e) => setLink(e.target.value)} />}
                <p className="text-xs text-muted-foreground">রিপোর index.html ফাইলটি লোড হবে এবং বর্তমান ওয়েবসাইটের জায়গায় বসবে।</p>
                <button disabled={busy} onClick={doImport} className={`${btn} w-full bg-brand`}>{busy && <Loader2 className="size-4 animate-spin" />} ইমপোর্ট করুন</button>
              </div>
            )}
            {tab === "history" && (
              histLoading ? <Loader2 className="mx-auto size-6 animate-spin text-cyan" /> : !hist?.repo ? <p className="text-center text-sm text-muted-foreground">এই প্রজেক্ট এখনো GitHub এ আপলোড হয়নি।</p> : (
                <div className="space-y-2">
                  <a href={`https://github.com/${hist.repo}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-en text-sm text-cyan">{hist.repo} <ExternalLink className="size-3" /></a>
                  {"error" in hist && hist.error && <p className="text-sm text-destructive">{hist.error}</p>}
                  {hist.commits.map((c) => (
                    <a key={c.sha} href={c.url} target="_blank" rel="noreferrer" className="flex gap-3 rounded-xl border border-border p-3 hover:border-cyan">
                      <GitCommit className="mt-0.5 size-4 shrink-0 text-cyan" />
                      <div className="min-w-0"><p className="line-clamp-2 text-sm">{c.message}</p><p className="text-xs text-muted-foreground"><span className="font-en">{c.sha}</span> · {bnDate(c.date)}</p></div>
                    </a>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
