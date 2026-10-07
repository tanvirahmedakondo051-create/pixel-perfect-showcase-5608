import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ScanSearch, Sparkles } from "lucide-react";
import { analyzeWebsite, type Analysis } from "@/lib/analyze.functions";

export function analysisPrompt(a: Analysis) {
  return `এই ওয়েবসাইটের স্টাইল থেকে অনুপ্রাণিত হয়ে একটি সম্পূর্ণ নতুন ও মৌলিক ওয়েবসাইট বানাও (কপি নয়)।
বিশ্লেষিত সাইট: ${a.url}
ধরন: ${a.category}
রঙ: ${a.colors.join(", ")}
ফন্ট: ${a.fonts.join(", ") || "আধুনিক sans-serif"}
লেআউট সেকশন: ${a.sections.join(" → ")}
Use the analyzed colors, fonts, and layout style as inspiration. Create ORIGINAL content, do not copy text or images.`;
}

export default function AnalyzerPanel({ onBuild, disabled }: { onBuild: (prompt: string) => void; disabled?: boolean }) {
  const analyze = useServerFn(analyzeWebsite);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Analysis | null>(null);

  const run = async () => {
    if (!url.trim()) return toast.error("ওয়েবসাইটের লিংক দিন");
    setBusy(true);
    setRes(null);
    try {
      const r = await analyze({ data: { url: url.trim() } });
      if ("error" in r) toast.error(r.error);
      else setRes(r.analysis);
    } catch {
      toast.error("বিশ্লেষণ করা যায়নি, আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      <div>
        <h2 className="font-semibold">ওয়েবসাইট দেখে বানান</h2>
        <p className="text-sm text-muted-foreground">যেকোনো সাইটের লিংক দিন — রঙ, ফন্ট আর লেআউট দেখে নতুন সাইট বানাবো।</p>
      </div>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} inputMode="url" placeholder="যেমন: daraz.com.bd" className="min-h-12 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 font-en text-sm outline-none focus:border-cyan" />
        <button onClick={run} disabled={busy} className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />} বিশ্লেষণ করুন
        </button>
      </div>

      {busy && <div className="space-y-2">{[60, 90, 75].map((w, i) => <div key={i} className="h-5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}</div>}

      {res && (
        <div className="glass space-y-4 rounded-2xl p-4 animate-in fade-in">
          <div>
            <p className="line-clamp-1 font-semibold">{res.title}</p>
            <span className="mt-1 inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-xs text-cyan">{res.category}</span>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">প্রধান রঙ</p>
            <div className="flex flex-wrap gap-2">
              {res.colors.length ? res.colors.map((c) => (
                <button key={c} onClick={() => { navigator.clipboard?.writeText(c); toast.success(`${c} কপি হয়েছে`); }} className="text-center">
                  <span className="block size-11 rounded-xl border border-border" style={{ background: c }} />
                  <span className="mt-1 block font-en text-[10px] text-muted-foreground">{c}</span>
                </button>
              )) : <span className="text-sm text-muted-foreground">পাওয়া যায়নি</span>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">ফন্ট</p>
            <div className="flex flex-wrap gap-1.5">
              {(res.fonts.length ? res.fonts : ["শনাক্ত হয়নি"]).map((f) => <span key={f} className="rounded-lg bg-muted px-2.5 py-1 font-en text-xs">{f}</span>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">লেআউট সেকশন</p>
            <ol className="space-y-1 text-sm">
              {res.sections.map((s, i) => <li key={i} className="flex gap-2"><span className="text-cyan">{i + 1}.</span><span className="line-clamp-1">{s}</span></li>)}
            </ol>
          </div>
          <button disabled={disabled} onClick={() => onBuild(analysisPrompt(res))} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold disabled:opacity-50">
            <Sparkles className="size-4" /> এই স্টাইলে বানান
          </button>
        </div>
      )}
    </div>
  );
}
