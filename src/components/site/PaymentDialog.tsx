import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { bn, useSession } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site";

export function PaymentDialog({ plan, onClose }: { plan: { id: string; name: string; price: number }; onClose: () => void }) {
  const { user } = useSession();
  const { data: s } = useSiteSettings();
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [trx, setTrx] = useState("");
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (trx.trim().length < 4) return toast.error("সঠিক ট্রানজেকশন আইডি দিন");
    setBusy(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id, plan_id: plan.id, method, trx_id: trx.trim(), sender_number: sender.trim(), amount: plan.price,
    });
    setBusy(false);
    if (error) return toast.error("জমা দেওয়া যায়নি, আবার চেষ্টা করুন");
    toast.success("পেমেন্ট তথ্য জমা হয়েছে! যাচাইয়ের পর প্ল্যান চালু হবে।");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan.name} প্ল্যান — ৳{bn(plan.price)}/মাস</DialogTitle>
          <DialogDescription>{s?.payment_instructions}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {(["bkash", "nagad"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`min-h-12 rounded-xl border font-semibold ${method === m ? "border-cyan bg-cyan/10" : "border-input"}`}>
              {m === "bkash" ? "বিকাশ" : "নগদ"}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label>যে নম্বর থেকে পাঠিয়েছেন</Label>
          <Input className="h-12" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
        </div>
        <div className="space-y-2">
          <Label>ট্রানজেকশন আইডি</Label>
          <Input className="h-12" value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="যেমন: 8N7A6B5C4D" />
        </div>
        <button disabled={busy} onClick={submit} className="min-h-12 rounded-xl bg-brand font-semibold disabled:opacity-60">
          {busy ? "জমা হচ্ছে..." : "জমা দিন"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
