import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ExternalLink, Copy, Trash2, Globe, FolderOpen, Crown, Zap, Layers } from "lucide-react";
import { AppHeader, SitePreviewThumb } from "@/components/app/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { bn, bnDate, tokensToday, useProfile, useSession } from "@/lib/auth";
import { createProject, recheckMyDomains, setPublished } from "@/lib/user.functions";
import { DomainStatusBadge } from "@/components/app/DomainDialog";
import { hostingStatus } from "@/lib/hosting";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "আমার প্রজেক্ট — Hexa AI" }, { name: "description", content: "আপনার সব ওয়েবসাইট প্রজেক্ট।" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const nav = useNavigate();
  const create = useServerFn(createProject);
  const publish = useServerFn(setPublished);
  const { data: profile } = useProfile(user?.id);
  const [del, setDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recheck = useServerFn(recheckMyDomains);
  useEffect(() => {
    if (!user) return;
    recheck().then((r) => { if (r.changed) { qc.invalidateQueries({ queryKey: ["projects", user.id] }); toast.success("আপনার কাস্টম ডোমেইন সংযুক্ত হয়েছে!"); } }).catch(() => {});
  }, [user?.id]);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, code_html, is_published, is_flagged, subdomain, updated_at, custom_domain, domain_status")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const newProject = async (copyFrom?: string) => {
    setBusy(true);
    const r = await create({ data: { copyFrom } });
    setBusy(false);
    if ("error" in r) return toast.error(r.error);
    if (copyFrom) {
      toast.success("ডুপ্লিকেট তৈরি হয়েছে");
      qc.invalidateQueries({ queryKey: ["projects"] });
    } else nav({ to: "/builder/$projectId", params: { projectId: r.id } });
  };

  const togglePublish = async (id: string, on: boolean) => {
    const r = await publish({ data: { id, publish: on } });
    if ("error" in r) return toast.error(r.error);
    toast.success(on ? "প্রকাশিত হয়েছে!" : "প্রকাশ বন্ধ করা হয়েছে");
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const doDelete = async () => {
    if (!del) return;
    const { error } = await supabase.from("projects").delete().eq("id", del);
    setDel(null);
    if (error) return toast.error("ডিলিট করা যায়নি");
    toast.success("প্রজেক্ট ডিলিট হয়েছে");
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const plan = profile?.plans as { name_bn: string; tokens_per_day: number; price_bdt: number; max_published: number } | null;
  const used = tokensToday(profile);
  const limit = plan?.tokens_per_day ?? 50000;
  const pct = Math.min(100, (used / limit) * 100);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_280px]">
        <section>
          {(() => {
            const pr: any = profile;
            const st = hostingStatus({ planExpiresAt: pr?.plan_expires_at ?? null, planEndedAt: pr?.plan_ended_at ?? null, fallbackCanHost: false });
            if (st.state === "active") return null;
            return (
              <div className="mb-5 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
                {st.state === "grace"
                  ? <>আপনার প্যাকেজের মেয়াদ শেষ। আপগ্রেড বা রিনিউ না করলে <b>{bn(st.daysLeft)} দিন</b> পর প্রকাশিত ওয়েবসাইটগুলো বন্ধ হয়ে যেতে পারে।</>
                  : <>আপনার প্যাকেজের মেয়াদ শেষ, ফ্রি প্যাকেজে হোস্টিং না থাকলে ওয়েবসাইট বন্ধ আছে।</>}{" "}
                <Link to="/pricing" className="font-semibold text-cyan">প্যাকেজ আপগ্রেড করুন</Link>
              </div>
            );
          })()}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">আমার প্রজেক্ট</h1>
            <button disabled={busy} onClick={() => newProject()} className="flex min-h-12 items-center gap-2 rounded-xl bg-brand px-4 font-semibold shadow-glow disabled:opacity-60">
              <Plus className="size-5" /> নতুন প্রজেক্ট
            </button>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="glass h-60 animate-pulse rounded-2xl" />)}</div>
          ) : !projects?.length ? (
            <div className="glass mt-6 flex flex-col items-center rounded-2xl px-6 py-14 text-center">
              <div className="grid size-20 place-items-center rounded-3xl bg-brand shadow-glow"><Layers className="size-10" /></div>
              <h2 className="mt-6 text-xl font-semibold">এখনো কোনো প্রজেক্ট নেই</h2>
              <p className="mt-1 text-muted-foreground">প্রথম ওয়েবসাইট বানান — শুধু বাংলায় লিখুন কী চান!</p>
              <button onClick={() => newProject()} className="mt-6 min-h-12 rounded-xl bg-brand px-6 font-semibold">প্রথম ওয়েবসাইট বানান</button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <div key={p.id} className="glass overflow-hidden rounded-2xl">
                  <Link to="/builder/$projectId" params={{ projectId: p.id }}><SitePreviewThumb html={p.code_html} /></Link>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
                      {p.is_flagged ? (
                        <span className="shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">পর্যালোচনায়</span>
                      ) : p.is_published ? (
                        <span className="shrink-0 rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">প্রকাশিত</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">সর্বশেষ এডিট: {bnDate(p.updated_at)}</p>
                    <div className="mt-3 grid grid-cols-4 gap-1">
                      <Link to="/builder/$projectId" params={{ projectId: p.id }} className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs hover:bg-accent"><FolderOpen className="size-4" />খুলুন</Link>
                      <button onClick={() => togglePublish(p.id, !p.is_published)} className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs hover:bg-accent"><Globe className="size-4" />{p.is_published ? "বন্ধ" : "প্রকাশ"}</button>
                      <button onClick={() => newProject(p.id)} className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs hover:bg-accent"><Copy className="size-4" />ডুপ্লিকেট</button>
                      <button onClick={() => setDel(p.id)} className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs text-destructive hover:bg-destructive/10"><Trash2 className="size-4" />ডিলিট</button>
                    </div>
                    {p.is_published && p.subdomain && (
                      <a href={`/s/${p.subdomain}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 truncate font-en text-xs text-cyan">
                        <ExternalLink className="size-3" /> /s/{p.subdomain}
                      </a>
                    )}
                    {p.custom_domain && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="truncate font-en">{p.custom_domain}</span>
                        <DomainStatusBadge status={p.domain_status} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="size-4 text-cyan" /> আজকের টোকেন</div>
            <p className="mt-2 text-lg font-semibold">{bn(used)} / {bn(limit)}</p>
            <Progress value={pct} className={`mt-2 h-2 ${pct >= 90 ? "[&>div]:bg-destructive" : "[&>div]:bg-cyan"}`} />
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="size-4 text-cyan" /> মোট প্রজেক্ট</div>
            <p className="mt-2 text-lg font-semibold">{bn(projects?.length ?? 0)}</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Crown className="size-4 text-cyan" /> বর্তমান প্ল্যান</div>
            <p className="mt-2 text-lg font-semibold">{plan?.name_bn ?? "ফ্রি"}</p>
            {(plan?.price_bdt ?? 0) === 0 && (
              <Link to="/pricing" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold">আপগ্রেড</Link>
            )}
          </div>
        </aside>
      </main>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>প্রজেক্টটি ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>এটি স্থায়ীভাবে মুছে যাবে, আর ফেরত আনা যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-12">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="min-h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90">হ্যাঁ, ডিলিট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
