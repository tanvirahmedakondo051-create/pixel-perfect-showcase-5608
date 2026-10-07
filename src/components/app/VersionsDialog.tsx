import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listVersions, rollbackVersion } from "@/lib/publish.functions";
import { bn, bnDate } from "@/lib/auth";

export function VersionsDialog({ open, onOpenChange, projectId, current, published, onRolledBack, onUnpublish }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; current: number; published: boolean; onRolledBack: (html: string) => void; onUnpublish: () => void }) {
  const qc = useQueryClient();
  const list = useServerFn(listVersions);
  const roll = useServerFn(rollbackVersion);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["versions", projectId], queryFn: () => list({ data: { id: projectId } }), enabled: open });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="size-5" /> ভার্সন ইতিহাস</DialogTitle></DialogHeader>
        {isLoading ? <Loader2 className="mx-auto size-6 animate-spin text-cyan" /> : !data?.length ? <p className="text-center text-sm text-muted-foreground">এখনো কোনো ভার্সন নেই। প্রকাশ করলে এখানে দেখা যাবে।</p> : (
          <div className="space-y-2">
            {data.map((v) => (
              <div key={v.id} className={`rounded-xl border p-3 ${v.version_number === current ? "border-success/60" : "border-border"}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">v{bn(v.version_number)}</span>
                  {v.version_number === current && <span className="rounded-full bg-success/15 px-2 text-xs text-success">লাইভ</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{bnDate(v.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{v.changelog_bn}</p>
                {published && v.version_number !== current && (
                  <button disabled={!!busy} onClick={async () => {
                    setBusy(v.id);
                    const r = await roll({ data: { id: projectId, versionId: v.id } });
                    setBusy(null);
                    if ("error" in r) return toast.error(r.error);
                    onRolledBack(r.html);
                    qc.invalidateQueries({ queryKey: ["project", projectId] });
                    toast.success(`v${bn(r.version)} আবার লাইভ হয়েছে`);
                  }} className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:border-cyan">
                    {busy === v.id && <Loader2 className="size-4 animate-spin" />} রোলব্যাক
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {published && <button onClick={() => { onUnpublish(); onOpenChange(false); }} className="mt-2 min-h-12 w-full rounded-xl border border-destructive/50 text-destructive">প্রকাশ বন্ধ করুন</button>}
      </DialogContent>
    </Dialog>
  );
}
