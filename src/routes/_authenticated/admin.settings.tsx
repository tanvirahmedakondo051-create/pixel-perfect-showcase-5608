import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetAuraKey, adminSetAuraKey, adminGetDeployToken, adminNewDeployToken, adminTestAgent, adminGetBackendKey, adminSetBackendKey } from "@/lib/admin.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/site";
import { PageTitle, Panel, btn } from "@/components/admin/ui";
import { Field, Toggle, inputCls } from "@/components/admin/fields";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "সাইট সেটিংস — অ্যাডমিন" }] }),
  component: Settings,
});

const keys = ["site_name", "tagline", "logo_url", "announcement_text", "announcement_color", "announcement_active", "maintenance_mode", "support_email", "telegram_link", "aurapay_enabled", "ns1", "ns2", "ns3", "ns4", "server_ip", "hosting_domain", "grace_days", "delete_after_days", "support_whatsapp", "agent_host", "agent_port", "backend_max_tables", "backend_max_rows", "backend_master_url"] as const;

function Settings() {
  const { data: s } = useSiteSettings();
  const qc = useQueryClient();
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (s) setF(Object.fromEntries(keys.map((k) => [k, (s as any)[k] ?? ""]))); }, [s]);
  if (!f) return null;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function save() {
    const { error } = await supabase.from("site_settings").update({ ...f, logo_url: f.logo_url || null, grace_days: Math.max(1, Number(f.grace_days) || 7), delete_after_days: Math.max(Number(f.grace_days) || 7, Number(f.delete_after_days) || 30), agent_port: Number(f.agent_port) || 8443, backend_max_tables: Math.max(1, Number(f.backend_max_tables) || 10), backend_max_rows: Math.max(100, Number(f.backend_max_rows) || 10000) } as any).eq("id", 1);
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
            <Field label="WhatsApp নম্বর (মেয়াদ শেষ পেজে দেখাবে)"><input className={`${inputCls} font-en`} value={f.support_whatsapp} onChange={set("support_whatsapp")} placeholder="8801XXXXXXXXX" /></Field>
          </div>
          <AuraKey />
          <Toggle label="AuraPay পেমেন্ট চালু" checked={!!f.aurapay_enabled} onChange={(v) => setF({ ...f, aurapay_enabled: v })} />
        </div>
      </Panel>
      <Panel title="সার্ভার (অটো ডিপ্লয়)">
        <DeployServer f={f} set={set} />
      </Panel>
      <Panel title="ব্যাকএন্ড (ইউজারদের সাইটের ডেটাবেস)">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">ইউজারের সাইটে লগইন/ফর্ম/ডেটা সেভ লাগলে প্ল্যাটফর্মের নিজস্ব ডেটাবেসে আলাদা আলাদা টেবিল তৈরি হয় — এখনই কাজ করে, কিছু সেটআপ লাগে না। ভবিষ্যতে আলাদা মাস্টার প্রজেক্ট ব্যবহারের জন্য নিচের তথ্য রাখতে পারেন (ঐচ্ছিক)।</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="প্রতি প্রজেক্টে সর্বোচ্চ টেবিল"><input type="number" min={1} className={inputCls} value={f.backend_max_tables} onChange={set("backend_max_tables")} /></Field>
            <Field label="প্রতি টেবিলে সর্বোচ্চ রো"><input type="number" min={100} className={inputCls} value={f.backend_max_rows} onChange={set("backend_max_rows")} /></Field>
            <Field label="মাস্টার প্রজেক্ট URL (ঐচ্ছিক)"><input className={`${inputCls} font-en`} value={f.backend_master_url} onChange={set("backend_master_url")} placeholder="https://xxxx.supabase.co" /></Field>
          </div>
          <BackendKey />
        </div>
      </Panel>
      <Panel title="প্ল্যানের মেয়াদ শেষ হলে">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">মেয়াদ শেষের পর প্রথম কয়েক দিন সাইটের জায়গায় শুধু "প্ল্যান আপগ্রেড করুন" পেজ দেখাবে, তারপর সাইট বন্ধ থাকবে, শেষে সাইটের ফাইল ও ডেটা স্থায়ীভাবে মুছে যাবে।</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="নোটিশ পেজ কত দিন (grace days)"><input type="number" min={1} className={inputCls} value={f.grace_days} onChange={set("grace_days")} /></Field>
            <Field label="কত দিন পর স্থায়ীভাবে মুছবে"><input type="number" min={1} className={inputCls} value={f.delete_after_days} onChange={set("delete_after_days")} /></Field>
          </div>
        </div>
      </Panel>
      <Panel title="হোস্টিং ও ডোমেইন">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">কাস্টম ডোমেইন যোগ করার সময় ইউজার এই নেমসার্ভারগুলো দেখবে। ডোমেইন সংযুক্ত হয়েছে কিনা তা এগুলোর সাথে মিলিয়ে যাচাই হবে।</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="নেমসার্ভার ১"><input className={`${inputCls} font-en`} value={f.ns1} onChange={set("ns1")} placeholder="ns1.example.com" /></Field>
            <Field label="নেমসার্ভার ২"><input className={`${inputCls} font-en`} value={f.ns2} onChange={set("ns2")} placeholder="ns2.example.com" /></Field>
            <Field label="নেমসার্ভার ৩ (ঐচ্ছিক)"><input className={`${inputCls} font-en`} value={f.ns3} onChange={set("ns3")} /></Field>
            <Field label="নেমসার্ভার ৪ (ঐচ্ছিক)"><input className={`${inputCls} font-en`} value={f.ns4} onChange={set("ns4")} /></Field>
            <Field label="ফ্রি সাবডোমেইনের মূল ডোমেইন (ঐচ্ছিক)"><input className={`${inputCls} font-en`} value={f.hosting_domain} onChange={set("hosting_domain")} placeholder="sites.example.com" /></Field>
          </div>
          <NginxConfig f={f} />
        </div>
      </Panel>
      <button className={`${btn} min-h-12 w-full bg-brand sm:w-auto`} onClick={save}>সেভ করুন</button>
    </div>
  );
}

function BackendKey() {
  const get = useServerFn(adminGetBackendKey);
  const setKey = useServerFn(adminSetBackendKey);
  const { data, refetch } = useQuery({ queryKey: ["backend-key"], queryFn: () => get() });
  const [v, setV] = useState("");
  return (
    <Field label={`মাস্টার Service Key ${data?.masked ? `(বর্তমান: ${data.masked})` : "(ঐচ্ছিক)"}`}>
      <div className="flex gap-2">
        <input className={`${inputCls} font-en`} type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder="নতুন Key বসান" />
        <button className={`${btn} bg-brand shrink-0`} onClick={async () => {
          if (v.trim().length < 8) return toast.error("সঠিক Key দিন");
          const r = await setKey({ data: { key: v } });
          if ("error" in r) return toast.error(r.error);
          setV(""); refetch(); toast.success("সেভ হয়েছে");
        }}>সেভ</button>
      </div>
    </Field>
  );
}

function AuraKey() {
  const get = useServerFn(adminGetAuraKey);
  const setKey = useServerFn(adminSetAuraKey);
  const { data, refetch } = useQuery({ queryKey: ["aura-key"], queryFn: () => get() });
  const [v, setV] = useState("");
  return (
    <Field label={`AuraPay API Key ${!data ? "" : data.masked ? `(বর্তমান: ${data.masked})` : "(এখনো দেওয়া হয়নি)"}`}>
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

function NginxConfig({ f }: { f: any }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const app = origin.replace(/^https?:\/\//, "");
  const names = ["_", f.hosting_domain ? `*.${f.hosting_domain}` : ""].filter(Boolean).join(" ");
  const conf = `# /etc/nginx/conf.d/hexa-sites.conf
proxy_cache_path /var/cache/nginx/hexa levels=1:2 keys_zone=hexa:50m max_size=2g inactive=7d use_temp_path=off;

server {
    listen 80 default_server;
    server_name ${names};

    gzip on;
    gzip_types text/html text/css application/javascript image/svg+xml;

    location / {
        rewrite ^ /api/public/site break;
        proxy_pass https://${app || "YOUR-APP-URL"};
        proxy_ssl_server_name on;
        proxy_set_header Host ${app || "YOUR-APP-URL"};
        proxy_set_header X-Hexa-Host $host;

        proxy_cache hexa;
        proxy_cache_key $host;
        proxy_cache_valid 200 404 60s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        add_header X-Cache $upstream_cache_status;
    }
}`;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">VPS-এর জন্য nginx সেটআপ</p>
      <p className="text-xs text-muted-foreground">এটি কপি করে VPS-এ বসান, তারপর SSL চালু করুন (যেমন certbot)। এই পেজটি প্রকাশিত সাইট থেকে খুললে ঠিকানাটি সঠিক আসবে।</p>
      <pre className="max-h-72 overflow-auto whitespace-pre rounded-xl border border-border bg-background/60 p-3 font-en text-xs">{conf}</pre>
      <button className={`${btn} border border-input`} onClick={() => { navigator.clipboard.writeText(conf); toast.success("কপি হয়েছে"); }}>কপি করুন</button>
    </div>
  );
}

function DeployServer({ f, set }: { f: any; set: (k: string) => (e: any) => void }) {
  const get = useServerFn(adminGetDeployToken);
  const gen = useServerFn(adminNewDeployToken);
  const test = useServerFn(adminTestAgent);
  const { data, refetch } = useQuery({ queryKey: ["deploy-token"], queryFn: () => get() });
  const [fresh, setFresh] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const host = f.agent_host || "deploy.example.com";
  const cmd = `curl -fsSL ${origin}/install-agent.sh | sudo HEXA_APP_URL=${origin} bash -s -- ${fresh || "<TOKEN>"} ${host} "${f.support_email || ""}" ${f.agent_port || 8443} ${f.ns1 || ""} ${f.ns2 || ""} ${f.server_ip || ""}`.replace(/\s+/g, " ").trim();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">প্রকাশ বা লাইভ আপডেট চাপলে সাইটটি আপনার VPS এ স্ট্যাটিক ফাইল হিসেবে চলে যাবে (nginx + gzip + ক্যাশ + SSL)। এজেন্টের ঠিকানার DNS আপনার VPS এর IP তে পয়েন্ট করা থাকতে হবে।</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="VPS সার্ভার IP"><input className={`${inputCls} font-en`} value={f.server_ip} onChange={set("server_ip")} placeholder="123.45.67.89" /></Field>
        <Field label="এজেন্টের ঠিকানা (ডোমেইন)"><input className={`${inputCls} font-en`} value={f.agent_host} onChange={set("agent_host")} placeholder="deploy.example.com" /></Field>
        <Field label="এজেন্ট পোর্ট"><input type="number" className={`${inputCls} font-en`} value={f.agent_port} onChange={set("agent_port")} placeholder="8443" /></Field>
        <Field label={`ডিপ্লয় টোকেন ${data?.masked ? `(বর্তমান: ${data.masked})` : "(এখনো নেই)"}`}>
          <button className={`${btn} min-h-12 w-full border border-border`} onClick={async () => {
            const r = await gen();
            if ("error" in r) return toast.error(r.error);
            setFresh(r.token); refetch(); toast.success("নতুন টোকেন তৈরি হয়েছে — নিচের কমান্ডটি কপি করুন");
          }}>নতুন টোকেন তৈরি করুন</button>
        </Field>
      </div>
      <Field label="VPS এ একবার এই কমান্ডটি চালান (Ubuntu)">
        <div className="flex gap-2">
          <code className="block flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-muted p-3 font-en text-xs">{cmd}</code>
          <button className={`${btn} shrink-0 border border-border`} onClick={() => { navigator.clipboard.writeText(cmd); toast.success("কপি হয়েছে"); }}>কপি</button>
        </div>
      </Field>
      {!fresh && <p className="text-xs text-muted-foreground">নিরাপত্তার জন্য টোকেন একবারই দেখানো হয়। কমান্ডে টোকেন দেখতে "নতুন টোকেন তৈরি করুন" চাপুন (পুরনো টোকেন বাতিল হবে)।</p>}
      <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">🌐 অটো DNS: নেমসার্ভার ১/২ ও সার্ভার IP সেভ করে কমান্ডটি আবার চালান — এতে VPS এ DNS সার্ভার চালু হবে এবং কাস্টম ডোমেইনের DNS নিজে থেকে তৈরি হবে। আপনার ডোমেইন রেজিস্ট্রারে ns1/ns2 এর "glue record" VPS IP তে পয়েন্ট করুন।</p>
      <button className={`${btn} min-h-12 border border-border`} onClick={async () => {
        const r = await test();
        if ("error" in r) toast.error(r.error); else toast.success("সার্ভারের সাথে সংযোগ ঠিক আছে ✓");
      }}>সংযোগ পরীক্ষা করুন (আগে সেভ করুন)</button>
    </div>
  );
}
