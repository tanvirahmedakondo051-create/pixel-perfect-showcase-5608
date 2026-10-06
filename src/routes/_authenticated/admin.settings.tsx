import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetAuraKey, adminSetAuraKey } from "@/lib/admin.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/site";
import { PageTitle, Panel, btn } from "@/components/admin/ui";
import { Field, Toggle, inputCls } from "@/components/admin/fields";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "সাইট সেটিংস — অ্যাডমিন" }] }),
  component: Settings,
});

const keys = ["site_name", "tagline", "logo_url", "announcement_text", "announcement_color", "announcement_active", "maintenance_mode", "support_email", "telegram_link", "aurapay_enabled"] as const;

function Settings() {
  const { data: s } = useSiteSettings();
  const qc = useQueryClient();
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (s) setF(Object.fromEntries(keys.map((k) => [k, (s as any)[k] ?? ""]))); }, [s]);
  if (!f) return null;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function save() {
    const { error } = await supabase.from("site_settings").update({ ...f, logo_url: f.logo_url || null }).eq("id", 1);
    if (error) return toast.error("সেভ করা যায়নি");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast.success("সেটিংস সেভ হয়েছে");
  }

  return (
    <div className="space-y-6">
      <PageTitle title="সাইট সেটিংস" />
      <Panel title="ব্র্যান্ড">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="সাইটের নাম"><input className={inputCls} value={f.site_name} onChange={set("site_name")} /></Field>
          <Field label="ট্যাগলাইন"><input className={inputCls} value={f.tagline} onChange={set("tagline")} /></Field>
          <Field label="লোগোর লিংক (ঐচ্ছিক)"><input className={inputCls} value={f.logo_url} onChange={set("logo_url")} placeholder="https://..." /></Field>
        </div>
      </Panel>
      <Panel title="ঘোষণা ব্যানার">
        <div className="space-y-3">
          <Field label="লেখা"><input className={inputCls} value={f.announcement_text} onChange={set("announcement_text")} /></Field>
          <Field label="রঙ"><input type="color" className="h-11 w-20 rounded-xl border border-input bg-transparent" value={f.announcement_color} onChange={set("announcement_color")} /></Field>
          <Toggle label="ব্যানার দেখাবে" checked={f.announcement_active} onChange={(v) => setF({ ...f, announcement_active: v })} />
        </div>
      </Panel>
      <Panel title="মেইনটেন্যান্স">
        <Toggle label="মেইনটেন্যান্স মোড (শুধু অ্যাডমিন সাইট দেখবে)" checked={f.maintenance_mode} onChange={(v) => setF({ ...f, maintenance_mode: v })} />
      </Panel>
      <Panel title="সাপোর্ট ও পেমেন্ট">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="সাপোর্ট ইমেইল"><input className={inputCls} value={f.support_email} onChange={set("support_email")} /></Field>
            <Field label="টেলিগ্রাম লিংক"><input className={inputCls} value={f.telegram_link} onChange={set("telegram_link")} /></Field>
          </div>
          <AuraKey />
          <Toggle label="AuraPay পেমেন্ট চালু" checked={!!f.aurapay_enabled} onChange={(v) => setF({ ...f, aurapay_enabled: v })} />
        </div>
      </Panel>
      <button className={`${btn} min-h-12 w-full bg-brand sm:w-auto`} onClick={save}>সেভ করুন</button>
    </div>
  );
}

function AuraKey() {
  const get = useServerFn(adminGetAuraKey);
  const setKey = useServerFn(adminSetAuraKey);
  const { data, refetch } = useQuery({ queryKey: ["aura-key"], queryFn: () => get() });
  const [v, setV] = useState("");
  return (
    <Field label={`AuraPay API Key ${data?.masked ? `(বর্তমান: ${data.masked})` : "(এখনো দেওয়া হয়নি)"}`}>
      <div className="flex gap-2">
        <input className={`${inputCls} font-en`} type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder="নতুন API Key বসান" />
        <button className={`${btn} bg-brand shrink-0`} onClick={async () => {
          if (v.trim().length < 8) return toast.error("সঠিক API Key দিন");
          const r = await setKey({ data: { key: v } });
          if ("error" in r) return toast.error(r.error);
          setV(""); refetch(); toast.success("API Key সেভ হয়েছে");
        }}>সেভ</button>
      </div>
    </Field>
  );
}
