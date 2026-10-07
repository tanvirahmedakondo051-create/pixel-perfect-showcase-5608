import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, Confirm, btn } from "@/components/admin/ui";
import { Field, inputCls } from "@/components/admin/fields";

export const Route = createFileRoute("/_authenticated/admin/assets")({
  head: () => ({ meta: [{ title: "অ্যাসেট — অ্যাডমিন" }] }),
  component: AdminAssets,
});

const CATS: Record<string, string> = { animation: "অ্যানিমেশন", icon: "আইকন", illustration: "ইলাস্ট্রেশন", background: "ব্যাকগ্রাউন্ড" };
const TYPES: Record<string, string> = { lottie: "Lottie JSON", svg: "SVG", png: "PNG / ছবি", css: "CSS ব্যাকগ্রাউন্ড" };

function readFile(f: File, asDataUrl: boolean) {
  return new Promise<string>((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = no;
    asDataUrl ? r.readAsDataURL(f) : r.readAsText(f);
  });
}

function AdminAssets() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["assets"], queryFn: async () => (await supabase.from("assets").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [f, setF] = useState({ name: "", category: "illustration", type: "svg", url_or_code: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 500_000) return toast.error("ফাইল ৫০০KB এর কম হতে হবে");
    const isPng = /image\/(png|jpe?g|webp)/.test(file.type);
    const type = isPng ? "png" : /svg/.test(file.type) || file.name.endsWith(".svg") ? "svg" : "lottie";
    const content = await readFile(file, isPng);
    if (type === "lottie") { try { JSON.parse(content); } catch { return toast.error("সঠিক Lottie JSON ফাইল দিন"); } }
    setF((x) => ({ ...x, type, url_or_code: content, name: x.name || file.name.replace(/\.\w+$/, ""), category: type === "lottie" ? "animation" : x.category }));
    toast.success("ফাইল লোড হয়েছে");
  };

  const save = async () => {
    if (!f.name.trim() || !f.url_or_code.trim()) return toast.error("নাম আর ফাইল/কোড দিন");
    setSaving(true);
    const { error } = await supabase.from("assets").insert({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) });
    setSaving(false);
    if (error) return toast.error("সেভ করা যায়নি");
    toast.success("অ্যাসেট যোগ হয়েছে");
    setF({ name: "", category: f.category, type: f.type, url_or_code: "", tags: "" });
    qc.invalidateQueries({ queryKey: ["assets"] });
  };

  const list = (data as any[] | undefined)?.filter((a) => filter === "all" || a.category === filter) ?? [];

  return (
    <div className="space-y-4">
      <PageTitle title="অ্যাসেট লাইব্রেরি" />
      <Panel title="নতুন অ্যাসেট">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="নাম"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="ট্যাগ (কমা দিয়ে)"><input className={inputCls} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="shop, hero" /></Field>
          <Field label="ক্যাটাগরি">
            <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
          <Field label="ধরন">
            <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
        </div>
        <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm hover:border-primary">
          <Upload className="size-4" /> ফাইল আপলোড (Lottie JSON / SVG / PNG)
          <input type="file" accept=".json,.svg,image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <div className="mt-3"><Field label="অথবা কোড / লিংক বসান"><textarea rows={4} className={`${inputCls} py-2 font-mono text-xs`} value={f.url_or_code.startsWith("data:") ? "(ছবি লোড হয়েছে)" : f.url_or_code} onChange={(e) => setF({ ...f, url_or_code: e.target.value })} /></Field></div>
        <button disabled={saving} onClick={save} className={`${btn} mt-3 w-full bg-brand disabled:opacity-60`}>{saving ? "সেভ হচ্ছে..." : "যোগ করুন"}</button>
      </Panel>

      <div className="flex flex-wrap gap-1.5">
        {[["all", "সব"], ...Object.entries(CATS)].map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`min-h-11 rounded-lg px-3 text-sm ${filter === k ? "bg-primary text-primary-foreground" : "glass"}`}>{v}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((a) => (
          <div key={a.id} className="glass rounded-xl p-2">
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              {a.type === "css" ? <div className="size-full" ref={(el) => { if (el) el.style.cssText = a.url_or_code; }} />
                : a.type === "svg" ? <div className="grid size-full place-items-center bg-white p-1 [&_svg]:max-h-full [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: a.url_or_code }} />
                : a.type === "png" ? <img src={a.url_or_code} alt={a.name} loading="lazy" className="size-full object-contain" />
                : <div className="grid size-full place-items-center text-xs text-muted-foreground">Lottie</div>}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm">{a.name}</p><p className="text-xs text-muted-foreground">{CATS[a.category]}</p></div>
              <button onClick={() => setDelId(a.id)} className="grid size-11 place-items-center rounded-lg text-destructive hover:bg-accent" aria-label="মুছুন"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">৫০০+ আইকন বিল্ডারে আগে থেকেই আছে — এখানে শুধু নিজের অ্যাসেট দেখা যায়।</p>
      <Confirm open={!!delId} title="অ্যাসেট মুছবেন?" desc="এটি লাইব্রেরি থেকে সরিয়ে দেওয়া হবে।" onCancel={() => setDelId(null)} onConfirm={async () => {
        const { error } = await supabase.from("assets").delete().eq("id", delId!);
        setDelId(null);
        if (error) return toast.error("মুছা যায়নি");
        toast.success("মুছে ফেলা হয়েছে");
        qc.invalidateQueries({ queryKey: ["assets"] });
      }} />
    </div>
  );
}
