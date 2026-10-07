import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlans, useSiteSettings } from "@/lib/site";
import { adminResetUsage } from "@/lib/admin.functions";
import { PageTitle, Panel, Confirm, btn } from "@/components/admin/ui";
import { Field, Toggle, inputCls } from "@/components/admin/fields";

export const Route = createFileRoute("/_authenticated/admin/limits")({
  head: () => ({ meta: [{ title: "লিমিট — অ্যাডমিন" }] }),
  component: Limits,
});

function Limits() {
  const qc = useQueryClient();
  const { data: plans } = usePlans();
  const { data: s } = useSiteSettings();
  const reset = useServerFn(adminResetUsage);
  const [caps, setCaps] = useState<Record<string, number>>({});
  const [g, setG] = useState({ rate_limit_per_minute: 10, max_output_tokens: 16000, tokens_per_coin: 10000, free_block_publish: false, require_email_verify: false, single_pass_simple: false });
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (plans) setCaps(Object.fromEntries(plans.map((p) => [p.id, p.tokens_per_day]))); }, [plans]);
  useEffect(() => { if (s) setG({ rate_limit_per_minute: s.rate_limit_per_minute, max_output_tokens: s.max_output_tokens, tokens_per_coin: (s as any).tokens_per_coin ?? 10000, free_block_publish: s.free_block_publish, require_email_verify: s.require_email_verify, single_pass_simple: (s as any).single_pass_simple ?? false }); }, [s]);

  async function save() {
    for (const [id, v] of Object.entries(caps)) await supabase.from("plans").update({ tokens_per_day: +v }).eq("id", id);
    const { error } = await supabase.from("site_settings").update({ ...g, rate_limit_per_minute: +g.rate_limit_per_minute, max_output_tokens: +g.max_output_tokens, tokens_per_coin: Math.max(1, +g.tokens_per_coin) } as any).eq("id", 1);
    if (error) return toast.error("সেভ করা যায়নি");
    qc.invalidateQueries({ queryKey: ["plans"] });
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast.success("লিমিট সেভ হয়েছে");
  }

  return (
    <div className="space-y-6">
      <PageTitle title="লিমিট">
        <button className={`${btn} glass`} onClick={() => setConfirm(true)}><RotateCcw className="size-4" /> আজকের ব্যবহার রিসেট</button>
      </PageTitle>
      <Panel title="প্ল্যান অনুযায়ী দৈনিক টোকেন">
        <div className="grid gap-3 sm:grid-cols-2">
          {plans?.map((p) => (
            <Field key={p.id} label={p.name_bn}><input type="number" className={inputCls} value={caps[p.id] ?? 0} onChange={(e) => setCaps({ ...caps, [p.id]: +e.target.value })} /></Field>
          ))}
        </div>
      </Panel>
      <Panel title="সাধারণ লিমিট">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="প্রতি মিনিটে সর্বোচ্চ রিকোয়েস্ট"><input type="number" className={inputCls} value={g.rate_limit_per_minute} onChange={(e) => setG({ ...g, rate_limit_per_minute: +e.target.value })} /></Field>
          <Field label="কত টোকেনে ১ কয়েন"><input type="number" className={inputCls} value={g.tokens_per_coin} onChange={(e) => setG({ ...g, tokens_per_coin: +e.target.value })} /></Field>
          <Field label="সর্বোচ্চ আউটপুট টোকেন"><input type="number" className={inputCls} value={g.max_output_tokens} onChange={(e) => setG({ ...g, max_output_tokens: +e.target.value })} /></Field>
        </div>
        <div className="mt-3 space-y-2">
          <Toggle label="ফ্রি ইউজাররা প্রকাশ করতে পারবে না" checked={g.free_block_publish} onChange={(v) => setG({ ...g, free_block_publish: v })} />
          <Toggle label="ছোট সাইট এক ধাপে বানাও (কম কয়েন, কম ডিটেইল)" checked={g.single_pass_simple} onChange={(v) => setG({ ...g, single_pass_simple: v })} />
          <Toggle label="ইমেইল যাচাই ছাড়া বানানো যাবে না" checked={g.require_email_verify} onChange={(v) => setG({ ...g, require_email_verify: v })} />
        </div>
      </Panel>
      <button className={`${btn} min-h-12 w-full bg-brand sm:w-auto`} onClick={save}>সব সেভ করুন</button>
      <Confirm open={confirm} title="সবার আজকের ব্যবহার রিসেট করবেন?" onCancel={() => setConfirm(false)} onConfirm={async () => { await reset(); setConfirm(false); toast.success("রিসেট হয়েছে"); }} />
    </div>
  );
}
