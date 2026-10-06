import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlans } from "@/lib/site";
import { bn } from "@/lib/auth";
import { PageTitle, Confirm, btn } from "@/components/admin/ui";
import { Field, Toggle, inputCls } from "@/components/admin/fields";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({ meta: [{ title: "প্ল্যান — অ্যাডমিন" }] }),
  component: Plans,
});

const empty = { id: undefined as string | undefined, name_en: "", name_bn: "", price_bdt: 0, tokens_per_day: 50000, max_projects: 3, features: "", show_badge: true, allow_custom_domain: false, is_default: false };

function Plans() {
  const { data } = usePlans();
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof empty | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["plans"] });

  async function submit() {
    if (!form || !form.name_bn || !form.name_en) return toast.error("নাম দিন");
    const { id, features, ...rest } = form;
    const row = { ...rest, price_bdt: +rest.price_bdt, tokens_per_day: +rest.tokens_per_day, max_projects: +rest.max_projects, features: features.split("\n").map((f) => f.trim()).filter(Boolean) };
    if (row.is_default) await supabase.from("plans").update({ is_default: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    const { error } = id ? await supabase.from("plans").update(row).eq("id", id) : await supabase.from("plans").insert(row);
    if (error) return toast.error("সেভ করা যায়নি");
    toast.success("সেভ হয়েছে");
    setForm(null);
    refresh();
  }

  return (
    <div>
      <PageTitle title="প্ল্যান">
        <button className={`${btn} bg-brand`} onClick={() => setForm({ ...empty })}><Plus className="size-4" /> নতুন প্ল্যান</button>
      </PageTitle>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2"><h3 className="text-lg font-semibold">{p.name_bn}</h3>{p.is_default && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-cyan">ডিফল্ট</span>}</div>
            <p className="mt-1 text-2xl font-bold">৳{bn(p.price_bdt)}<span className="text-sm font-normal text-muted-foreground">/মাস</span></p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>দৈনিক টোকেন: {bn(p.tokens_per_day)}</li>
              <li>সর্বোচ্চ প্রজেক্ট: {bn(p.max_projects)}</li>
              <li>ব্যাজ: {p.show_badge ? "দেখাবে" : "দেখাবে না"}</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button className={`${btn} glass`} onClick={() => setForm({ ...empty, ...p, features: p.features.join("\n") })}><Pencil className="size-4" /> এডিট</button>
              <button className={`${btn} text-destructive`} onClick={() => setDelId(p.id)}><Trash2 className="size-4" /> মুছুন</button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "প্ল্যান এডিট" : "নতুন প্ল্যান"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="বাংলা নাম"><input className={inputCls} value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} /></Field>
                <Field label="ইংরেজি নাম"><input className={inputCls} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="দাম (৳)"><input type="number" className={inputCls} value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: +e.target.value })} /></Field>
                <Field label="দৈনিক টোকেন"><input type="number" className={inputCls} value={form.tokens_per_day} onChange={(e) => setForm({ ...form, tokens_per_day: +e.target.value })} /></Field>
                <Field label="প্রজেক্ট"><input type="number" className={inputCls} value={form.max_projects} onChange={(e) => setForm({ ...form, max_projects: +e.target.value })} /></Field>
              </div>
              <Field label="ফিচার (প্রতি লাইনে একটি)"><textarea rows={4} className={`${inputCls} py-2`} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></Field>
              <Toggle label="Hexa AI ব্যাজ দেখাবে" checked={form.show_badge} onChange={(v) => setForm({ ...form, show_badge: v })} />
              <Toggle label="কাস্টম ডোমেইন" checked={form.allow_custom_domain} onChange={(v) => setForm({ ...form, allow_custom_domain: v })} />
              <Toggle label="নতুন ইউজারের ডিফল্ট প্ল্যান" checked={form.is_default} onChange={(v) => setForm({ ...form, is_default: v })} />
              <button className={`${btn} w-full bg-brand`} onClick={submit}>সেভ করুন</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Confirm open={!!delId} title="প্ল্যান মুছবেন?" desc="এই প্ল্যানে থাকা ইউজার থাকলে মুছা যাবে না।" onCancel={() => setDelId(null)} onConfirm={async () => {
        const { error } = await supabase.from("plans").delete().eq("id", delId!);
        setDelId(null);
        if (error) return toast.error("মুছা যায়নি — প্ল্যানটি ব্যবহার হচ্ছে");
        toast.success("মুছে ফেলা হয়েছে");
        refresh();
      }} />
    </div>
  );
}
