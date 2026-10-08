import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSkillPacks, type SkillPack } from "@/lib/skills";
import { PageTitle, Panel, Confirm, btn } from "@/components/admin/ui";
import { Field, Toggle, inputCls } from "@/components/admin/fields";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/skills")({
  head: () => ({ meta: [{ title: "স্কিল প্যাক — অ্যাডমিন" }] }),
  component: Skills,
});

const empty: Partial<SkillPack> = { slug: "", name_bn: "", icon: "✨", system_prompt: "", is_active: true, sort_order: 10 };

function Skills() {
  const qc = useQueryClient();
  const { data, isLoading } = useSkillPacks(true);
  const [form, setForm] = useState<Partial<SkillPack> | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["skill-packs"] });

  async function save() {
    if (!form?.name_bn?.trim()) return toast.error("নাম দিন");
    const row = { slug: form.slug?.trim() || `pack-${Date.now()}`, name_bn: form.name_bn.trim(), icon: form.icon || "✨", system_prompt: form.system_prompt ?? "", is_active: !!form.is_active, sort_order: Number(form.sort_order) || 0 };
    const { error } = form.id ? await supabase.from("skill_packs").update(row).eq("id", form.id) : await supabase.from("skill_packs").insert(row);
    if (error) return toast.error("সেভ করা যায়নি");
    toast.success("সেভ হয়েছে");
    setForm(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageTitle title="স্কিল প্যাক">
        <button className={`${btn} bg-brand`} onClick={() => setForm({ ...empty })}><Plus className="size-4" /> নতুন ধরন</button>
      </PageTitle>
      <p className="text-sm text-muted-foreground">ইউজার সাইটের ধরন বাছাই করলে এই নির্দেশনা AI-কে দেওয়া হয়।</p>
      {isLoading ? <Loader2 className="size-6 animate-spin text-cyan" /> : !data?.length ? <Panel><p className="text-muted-foreground">কোনো স্কিল প্যাক নেই।</p></Panel> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.icon}</span>
                <h3 className="font-semibold">{s.name_bn}</h3>
                {(s.slug === "design-quality" || s.slug === "taste") && <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-xs text-cyan">সবসময় যুক্ত</span>}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${s.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>{s.is_active ? "চালু" : "বন্ধ"}</span>
              </div>
              <p className="mt-2 line-clamp-3 font-en text-xs text-muted-foreground">{s.system_prompt}</p>
              <div className="mt-4 flex gap-2">
                <button className={`${btn} glass`} onClick={() => setForm(s)}><Pencil className="size-4" /> এডিট</button>
                <button className={`${btn} text-destructive`} onClick={() => setDelId(s.id)}><Trash2 className="size-4" /> মুছুন</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "স্কিল প্যাক এডিট" : "নতুন স্কিল প্যাক"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Field label="আইকন"><input className={inputCls} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
                <Field label="নাম"><input className={inputCls} value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} placeholder="যেমন: হাসপাতাল" /></Field>
              </div>
              <Field label="ক্রম"><input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></Field>
              <Field label="AI নির্দেশনা"><textarea className={`${inputCls} py-2 font-en`} rows={10} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} /></Field>
              <Toggle label="চালু" checked={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
              <button className={`${btn} w-full bg-brand`} onClick={save}>সেভ করুন</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Confirm open={!!delId} title="স্কিল প্যাক মুছবেন?" onCancel={() => setDelId(null)} onConfirm={async () => { await supabase.from("skill_packs").delete().eq("id", delId!); setDelId(null); refresh(); toast.success("মুছে ফেলা হয়েছে"); }} />
    </div>
  );
}
