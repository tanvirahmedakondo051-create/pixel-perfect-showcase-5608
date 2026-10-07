import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Link2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSiteSettings } from "@/lib/site";
import { checkCustomDomain, setCustomDomain } from "@/lib/user.functions";
import { bnDate } from "@/lib/auth";

type P = { id: string; custom_domain: string | null; domain_status: string; domain_found_ns: string[]; domain_checked_at: string | null; dns_status?: string | null };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "অপেক্ষমাণ", cls: "bg-warning/15 text-warning" },
  connected: { label: "সংযুক্ত", cls: "bg-success/15 text-success" },
  wrong: { label: "ভুল নেমসার্ভার", cls: "bg-destructive/15 text-destructive" },
};

export function DomainStatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.pending!;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export function DomainDialog({ open, onOpenChange, project, onChanged }: { open: boolean; onOpenChange: (v: boolean) => void; project: P; onChanged: () => void }) {
  const { data: settings } = useSiteSettings();
  const save = useServerFn(setCustomDomain);
  const check = useServerFn(checkCustomDomain);
  const [domain, setDomain] = useState(project.custom_domain ?? "");
  const [busy, setBusy] = useState<"save" | "check" | "remove" | null>(null);
  const [dns, setDns] = useState<string | null>(project.dns_status ?? null);
  useEffect(() => { setDomain(project.custom_domain ?? ""); }, [project.custom_domain]);
  useEffect(() => { if (project.dns_status) setDns(project.dns_status); }, [project.dns_status]);
  const s: any = settings;
  const ns: string[] = [s?.ns1, s?.ns2, s?.ns3, s?.ns4].filter(Boolean);

  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success("কপি হয়েছে"); };

  async function doSave() {
    setBusy("save");
    try {
      const r = await save({ data: { id: project.id, domain: domain || project.custom_domain } });
      if ("error" in r) return toast.error(r.error);
      setDns(r.dns);
      toast.success("ডোমেইন সেভ হয়েছে। এখন নেমসার্ভার বদলান।");
      onChanged();
    } finally { setBusy(null); }
  }
  async function doRemove() {
    setBusy("remove");
    try {
      const r = await save({ data: { id: project.id, domain: null } });
      if ("error" in r) return toast.error(r.error);
      setDomain(""); onChanged(); toast.success("ডোমেইন সরানো হয়েছে");
    } finally { setBusy(null); }
  }
  async function doCheck() {
    setBusy("check");
    try {
      const r = await check({ data: { id: project.id } });
      if ("error" in r) return toast.error(r.error);
      if (r.status === "connected") toast.success("ডোমেইন সংযুক্ত হয়েছে!");
      else if (r.status === "wrong") toast.error("নেমসার্ভার এখনো মেলেনি");
      else toast("এখনো নেমসার্ভার পাওয়া যায়নি। বদলানোর পর ২৪–৪৮ ঘণ্টা লাগতে পারে।");
      onChanged();
    } finally { setBusy(null); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="size-5 text-cyan" />কাস্টম ডোমেইন</DialogTitle>
          <DialogDescription>নিজের ডোমেইনে ওয়েবসাইটটি দেখাতে নিচের ধাপগুলো অনুসরণ করুন।</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold">১. আপনার ডোমেইন</label>
            <div className="mt-2 flex gap-2">
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="myshop.com" className="min-h-12 w-full min-w-0 rounded-xl border border-input bg-background/60 px-3 font-en outline-none focus:border-primary" />
              <button disabled={!!busy || !domain.trim()} onClick={doSave} className="min-h-12 shrink-0 rounded-xl bg-brand px-4 font-semibold disabled:opacity-60">
                {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : "সেভ"}
              </button>
            </div>
          </div>

          {project.custom_domain && (
            <>
              <div>
                <p className="text-sm font-semibold">২. নেমসার্ভার বদলান</p>
                <p className="mt-1 text-sm text-muted-foreground">যেখান থেকে ডোমেইন কিনেছেন (যেমন Namecheap, GoDaddy, Hostinger) সেখানে লগইন করে ডোমেইনের "Nameservers" অংশে "Custom" বেছে নিন, তারপর নিচের নেমসার্ভারগুলো বসান।</p>
                {ns.length ? (
                  <div className="mt-3 space-y-2">
                    {ns.map((n) => (
                      <div key={n} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2 pl-3">
                        <span className="flex-1 truncate font-en text-sm">{n}</span>
                        <button onClick={() => copy(n)} className="grid size-11 place-items-center rounded-lg hover:bg-accent" aria-label="কপি করুন"><Copy className="size-4" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">অ্যাডমিন এখনো নেমসার্ভার সেট করেননি। সাপোর্টে যোগাযোগ করুন।</p>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold">৩. যাচাই করুন</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-en text-sm">{project.custom_domain}</span>
                  <DomainStatusBadge status={project.domain_status} />
                </div>
                {project.custom_domain && dns === "ok" && <p className="mt-2 text-xs text-success">DNS তৈরি হয়েছে ✅</p>}
                {project.custom_domain && dns === "error" && (
                  <button disabled={!!busy} onClick={doSave} className="mt-2 text-xs text-destructive underline">DNS তৈরি ব্যর্থ — আবার চেষ্টা করুন</button>
                )}
                {project.domain_found_ns?.length > 0 && project.domain_status !== "connected" && (
                  <p className="mt-2 text-xs text-muted-foreground">এখন পাওয়া নেমসার্ভার: <span className="font-en">{project.domain_found_ns.join(", ")}</span></p>
                )}
                {project.domain_checked_at && <p className="mt-1 text-xs text-muted-foreground">শেষ যাচাই: {bnDate(project.domain_checked_at)}</p>}
                <p className="mt-2 text-xs text-muted-foreground">নেমসার্ভার বদলানোর পর পুরোপুরি চালু হতে ২৪–৪৮ ঘণ্টা লাগতে পারে।</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button disabled={!!busy} onClick={doCheck} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-semibold disabled:opacity-60">
                    {busy === "check" && <Loader2 className="size-4 animate-spin" />}যাচাই করুন
                  </button>
                  <button disabled={!!busy} onClick={doRemove} className="min-h-12 rounded-xl border border-input px-4 text-sm disabled:opacity-60">ডোমেইন সরান</button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
