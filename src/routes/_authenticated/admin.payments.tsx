import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bn, bnDate } from "@/lib/auth";
import { adminDecidePayment } from "@/lib/admin.functions";
import { PageTitle, btn } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: Payments });

const statusBn: Record<string, string> = { pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "বাতিল" };

function Payments() {
  const qc = useQueryClient();
  const decide = useServerFn(adminDecidePayment);
  const { data } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const [pay, prof, plans] = await Promise.all([
        supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, name, email"),
        supabase.from("plans").select("id, name_bn"),
      ]);
      const u = Object.fromEntries((prof.data ?? []).map((p) => [p.id, p]));
      const pl = Object.fromEntries((plans.data ?? []).map((p) => [p.id, p.name_bn]));
      return (pay.data ?? []).map((p) => ({ ...p, user: u[p.user_id], plan: pl[p.plan_id] }));
    },
  });
  const act = async (id: string, approve: boolean) => {
    const r = await decide({ data: { id, approve } });
    if ("error" in r) return toast.error(r.error);
    toast.success(approve ? "অনুমোদিত, প্ল্যান চালু হয়েছে" : "বাতিল করা হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };
  return (
    <>
      <PageTitle title="পেমেন্ট অনুরোধ" />
      {!data?.length && <p className="py-10 text-center text-muted-foreground">এখনো কোনো পেমেন্ট অনুরোধ নেই</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="font-medium">{p.user?.name ?? "—"}</div><div className="truncate text-xs text-muted-foreground">{p.user?.email}</div></div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "approved" ? "bg-success/20 text-success" : p.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>{statusBn[p.status]}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">প্ল্যান:</span> {p.plan}</div>
              <div><span className="text-muted-foreground">পরিমাণ:</span> ৳{bn(p.amount)}</div>
              <div><span className="text-muted-foreground">মাধ্যম:</span> {p.method === "bkash" ? "বিকাশ" : "নগদ"}</div>
              <div><span className="text-muted-foreground">তারিখ:</span> {bnDate(p.created_at)}</div>
              <div className="col-span-2 font-en"><span className="font-sans text-muted-foreground">TrxID:</span> {p.trx_id} {p.sender_number && `· ${p.sender_number}`}</div>
            </div>
            {p.status === "pending" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => act(p.id, true)} className={`${btn} bg-brand`}>অনুমোদন</button>
                <button onClick={() => act(p.id, false)} className={`${btn} border border-input`}>বাতিল</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
