import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2, Ban, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bnDate } from "@/lib/auth";
import { PageTitle, Panel, Confirm, btn } from "@/components/admin/ui";
import { inputCls } from "@/components/admin/fields";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({ meta: [{ title: "মডারেশন — অ্যাডমিন" }] }),
  component: Moderation,
});

function Moderation() {
  const qc = useQueryClient();
  const flagged = useQuery({
    queryKey: ["admin-flagged"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id,name,user_id,code_html,flag_reason,created_at").eq("is_flagged", true).order("updated_at", { ascending: false });
      const ids = [...new Set((data ?? []).map((p) => p.user_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,email").in("id", ids) : { data: [] };
      const em = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email]));
      return (data ?? []).map((p) => ({ ...p, email: em[p.user_id] ?? "" }));
    },
  });
  const kws = useQuery({ queryKey: ["admin-kw"], queryFn: async () => (await supabase.from("flag_keywords").select("*").order("created_at")).data ?? [] });
  const [kw, setKw] = useState("");
  const [act, setAct] = useState<{ type: "delete" | "ban"; p: { id: string; user_id: string } } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-flagged"] });

  async function approve(id: string) {
    const { error } = await supabase.from("projects").update({ is_flagged: false, flag_reason: null }).eq("id", id);
    if (error) return toast.error("করা যায়নি");
    toast.success("অনুমোদিত");
    refresh();
  }
  async function doAct() {
    if (!act) return;
    if (act.type === "delete") {
      await supabase.from("projects").delete().eq("id", act.p.id);
      toast.success("প্রজেক্ট মুছে ইউজারকে সতর্ক করা হয়েছে");
    } else {
      await supabase.from("projects").update({ is_published: false }).eq("id", act.p.id);
      await supabase.from("profiles").update({ is_banned: true }).eq("id", act.p.user_id);
      toast.success("ইউজার ব্যান করা হয়েছে");
    }
    setAct(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageTitle title="মডারেশন" />
      <Panel title="ফ্ল্যাগ হওয়া প্রজেক্ট">
        {!flagged.data?.length ? <p className="text-sm text-muted-foreground">কোনো ফ্ল্যাগ হওয়া প্রজেক্ট নেই।</p> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {flagged.data.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-3">
                <div className="h-40 overflow-hidden rounded-lg bg-background">
                  <iframe title={p.name} srcDoc={p.code_html} sandbox="" className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-25" />
                </div>
                <h3 className="mt-2 font-semibold">{p.name}</h3>
                <p className="break-all text-xs text-muted-foreground">{p.email} · {bnDate(p.created_at)}</p>
                <p className="mt-1 text-sm text-warning">কারণ: {p.flag_reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={`${btn} glass`} onClick={() => approve(p.id)}><Check className="size-4" /> অনুমোদন</button>
                  <button className={`${btn} glass text-destructive`} onClick={() => setAct({ type: "delete", p })}><Trash2 className="size-4" /> মুছুন + সতর্ক</button>
                  <button className={`${btn} text-destructive`} onClick={() => setAct({ type: "ban", p })}><Ban className="size-4" /> ব্যান</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="নিষিদ্ধ শব্দের তালিকা">
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!kw.trim()) return;
          await supabase.from("flag_keywords").insert({ keyword: kw.trim() });
          setKw("");
          qc.invalidateQueries({ queryKey: ["admin-kw"] });
        }}>
          <input className={inputCls} value={kw} onChange={(e) => setKw(e.target.value)} placeholder="নতুন শব্দ" />
          <button className={`${btn} bg-brand`}><Plus className="size-4" /> যোগ</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {kws.data?.map((k) => (
            <span key={k.id} className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1 text-sm">
              {k.keyword}
              <button aria-label="মুছুন" className="grid size-8 place-items-center rounded-full hover:bg-background" onClick={async () => { await supabase.from("flag_keywords").delete().eq("id", k.id); qc.invalidateQueries({ queryKey: ["admin-kw"] }); }}><X className="size-3.5" /></button>
            </span>
          ))}
        </div>
      </Panel>
      <Confirm open={!!act} title={act?.type === "ban" ? "ইউজার ব্যান করবেন?" : "প্রজেক্ট মুছবেন?"} onCancel={() => setAct(null)} onConfirm={doAct} />
    </div>
  );
}
