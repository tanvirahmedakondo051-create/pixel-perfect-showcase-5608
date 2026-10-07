import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Loader2, Trash2, Sparkles, ChevronLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listBackend, backendRows, deleteBackendItem, setupBackend } from "@/lib/backend.functions";

const bn = (n: number) => n.toLocaleString("bn-BD");

export function BackendDialog({ open, onOpenChange, projectId, onChanged }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string; onChanged: () => void }) {
  const list = useServerFn(listBackend);
  const rowsFn = useServerFn(backendRows);
  const del = useServerFn(deleteBackendItem);
  const setup = useServerFn(setupBackend);
  const [table, setTable] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["backend", projectId], queryFn: () => list({ data: { projectId } }), enabled: open });
  const r = useQuery({ queryKey: ["backend-rows", projectId, table, page], queryFn: () => rowsFn({ data: { projectId, table: table!, page } }), enabled: open && !!table });
  const cur = q.data?.tables.find((t) => t.name === table);

  async function addViaAi() {
    if (ask.trim().length < 3) return toast.error("কী ধরনের ডেটা রাখতে চান লিখুন");
    setBusy(true);
    try {
      const res = await setup({ data: { projectId, prompt: ask } });
      if ("error" in res) return toast.error(res.error);
      if ((res as any).warning) toast.warning((res as any).warning); else toast.success(res.created.length ? `${bn(res.created.length)}টি টেবিল তৈরি হয়েছে` : "নতুন কোনো টেবিল লাগেনি");
      if (res.limitHit) toast.info("টেবিলের সীমা পূর্ণ");
      setAsk(""); q.refetch(); onChanged();
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTable(null); }}>
      <DialogContent className="max-h-[90dvh] w-[min(96vw,640px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {table && <button onClick={() => { setTable(null); setPage(0); }} className="grid size-9 place-items-center rounded-lg hover:bg-accent" aria-label="ফিরে যান"><ChevronLeft className="size-4" /></button>}
            <Database className="size-5 text-cyan" />{table ? <span className="font-en">{table}</span> : "ব্যাকএন্ড"}
          </DialogTitle>
        </DialogHeader>
        {q.isLoading ? <div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-cyan" /></div> : !table ? (
          <div className="space-y-4">
            {!q.data?.enabled && <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">এই সাইটে এখনো ব্যাকএন্ড চালু নেই। নিচে লিখুন কী ডেটা রাখতে চান (যেমন "অর্ডার আর কন্টাক্ট ফর্ম সেভ হবে, কাস্টমার লগইন করবে") — AI নিজে টেবিল বানাবে।</p>}
            {!!q.data?.tables.length && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{bn(q.data.tables.length)}/{bn(q.data.limits.maxTables)} টেবিল</span>
                  <span className="flex items-center gap-1"><Users className="size-3" />{bn(q.data.users)} জন ভিজিটর অ্যাকাউন্ট</span>
                </div>
                {q.data.tables.map((t) => (
                  <div key={t.name} className="glass flex items-center gap-3 rounded-2xl p-3">
                    <button onClick={() => { setTable(t.name); setPage(0); }} className="min-w-0 flex-1 text-left">
                      <p className="font-en font-semibold">{t.name} {t.schema?.private && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-sans text-[10px]">ব্যক্তিগত</span>}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.schema?.description || (t.schema?.columns ?? []).map((c: any) => c.name).join(", ")}</p>
                    </button>
                    <span className="shrink-0 text-xs text-cyan">{bn(t.rows)}/{bn(q.data!.limits.maxRows)} রো</span>
                    <button onClick={async () => { if (!confirm(`"${t.name}" টেবিল ও এর সব ডেটা মুছবেন?`)) return; await del({ data: { projectId, table: t.name } }); q.refetch(); }} className="grid size-10 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="মুছুন"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-semibold">AI দিয়ে টেবিল যোগ করুন</p>
              <textarea value={ask} onChange={(e) => setAsk(e.target.value)} rows={2} placeholder="যেমন: রিভিউ সেভ হবে — নাম, রেটিং, মন্তব্য" className="w-full rounded-xl border border-input bg-background/60 p-3 text-sm" />
              <button onClick={addViaAi} disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold disabled:opacity-60">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{q.data?.enabled ? "টেবিল যোগ করুন" : "⚡ অটো সেটআপ"}
              </button>
              <p className="text-xs text-muted-foreground">টেবিল তৈরির পর চ্যাটে বলুন সাইটে কোথায় ব্যবহার হবে — AI কোড আপডেট করবে।</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">কলাম: <span className="font-en">{(cur?.schema?.columns ?? []).map((c: any) => `${c.name} (${c.type})`).join(", ")}</span></p>
            {r.isLoading ? <Loader2 className="mx-auto size-5 animate-spin text-cyan" /> : !r.data?.rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">এখনো কোনো ডেটা নেই</p> : (
              r.data.rows.map((row) => (
                <div key={row.id} className="flex gap-2 rounded-xl border border-border p-2 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {Object.entries(row.data ?? {}).map(([k, v]) => <p key={k} className="break-words"><span className="font-en text-muted-foreground">{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}</p>)}
                    <p className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleString("bn-BD")}</p>
                  </div>
                  <button onClick={async () => { await del({ data: { projectId, table: table!, rowId: row.id } }); r.refetch(); q.refetch(); }} className="grid size-9 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="মুছুন"><Trash2 className="size-3.5" /></button>
                </div>
              ))
            )}
            <div className="flex justify-between pt-2">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">আগের</button>
              <button disabled={(r.data?.rows.length ?? 0) < 25} onClick={() => setPage(page + 1)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">পরের</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function FilesDialog({ open, onOpenChange, files }: { open: boolean; onOpenChange: (v: boolean) => void; files: { path: string; content: string }[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const f = files.find((x) => x.path === sel) ?? files[0];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] w-[min(96vw,900px)] max-w-none flex-col">
        <DialogHeader><DialogTitle>প্রজেক্টের ফাইল ({bn(files.length)}টি)</DialogTitle></DialogHeader>
        {!files.length ? <p className="text-sm text-muted-foreground">এখনো কোনো ফাইল নেই</p> : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
            <ul className="max-h-40 shrink-0 overflow-auto rounded-xl border border-border p-1 font-en text-xs md:max-h-none md:w-56">
              {files.map((x) => <li key={x.path}><button onClick={() => setSel(x.path)} className={`w-full truncate rounded-md px-2 py-1.5 text-left ${f?.path === x.path ? "bg-primary" : "hover:bg-accent"}`}>{x.path}</button></li>)}
            </ul>
            <pre className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-background/60 p-3 font-en text-xs">{f?.content}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
