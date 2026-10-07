import { useEffect, useMemo, useRef, useState, createElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { icons } from "lucide-react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Asset = { id: string; name: string; category: string; type: string; url_or_code: string; tags: string[] };
const CATS = [
  { id: "icon", label: "🎯 আইকন" },
  { id: "animation", label: "✨ অ্যানিমেশন" },
  { id: "illustration", label: "🖼️ ইলাস্ট্রেশন" },
  { id: "background", label: "🌈 ব্যাকগ্রাউন্ড" },
];

let lottieLoaded = false;
function ensureLottie() {
  if (lottieLoaded || typeof document === "undefined") return;
  lottieLoaded = true;
  const s = document.createElement("script");
  s.src = "https://unpkg.com/@lottiefiles/lottie-player@2/dist/lottie-player.js";
  document.head.appendChild(s);
}

/** Renders children only once scrolled into view (lazy preview). */
function Lazy({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className}>{on ? children : null}</div>;
}

function lottieSrc(a: Asset) {
  if (/^https?:|^data:/.test(a.url_or_code)) return a.url_or_code;
  return URL.createObjectURL(new Blob([a.url_or_code], { type: "application/json" }));
}

function Preview({ a }: { a: Asset }) {
  if (a.type === "css") return <div className="size-full rounded-lg" ref={(el) => { if (el) el.style.cssText += a.url_or_code; }} />;
  if (a.type === "svg") return <div className="grid size-full place-items-center rounded-lg bg-white p-1 [&_svg]:max-h-full [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: a.url_or_code }} />;
  if (a.type === "png") return <img src={a.url_or_code} alt={a.name} loading="lazy" className="size-full rounded-lg object-contain" />;
  if (a.type === "lottie") return createElement("lottie-player", { src: lottieSrc(a), autoplay: true, loop: true, style: { width: "100%", height: "100%" } });
  return null;
}

function snippet(a: Asset) {
  if (a.type === "css") return `ব্যাকগ্রাউন্ড হিসেবে এই CSS ব্যবহার করো (${a.name}): ${a.url_or_code}`;
  if (a.type === "lottie") return /^https?:/.test(a.url_or_code) ? `এই Lottie অ্যানিমেশন ব্যবহার করো (${a.name}): ${a.url_or_code}` : `"${a.name}" নামের Lottie অ্যানিমেশন ব্যবহার করো (JSON inline করে)।`;
  if (a.type === "png") return /^https?:/.test(a.url_or_code) ? `এই ছবি ব্যবহার করো (${a.name}): ${a.url_or_code}` : `"${a.name}" ছবিটি ব্যবহার করো।`;
  return `এই SVG (${a.name}) ব্যবহার করো: ${a.url_or_code}`;
}

export default function AssetPanel({ onPick }: { onPick: (text: string) => void }) {
  const [cat, setCat] = useState("icon");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(120);
  const { data: lib } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await supabase.from("assets").select("*").order("created_at", { ascending: false })).data as Asset[],
  });
  useEffect(() => { if (cat === "animation") ensureLottie(); setLimit(120); }, [cat, q]);

  const iconNames = useMemo(() => Object.keys(icons), []);
  const term = q.trim().toLowerCase();

  const list: Asset[] = useMemo(() => {
    const own = (lib ?? []).filter((a) => a.category === cat && (!term || a.name.toLowerCase().includes(term) || a.tags.some((t) => t.toLowerCase().includes(term))));
    if (cat !== "icon") return own;
    const builtIn = iconNames.filter((n) => !term || n.toLowerCase().includes(term)).map((n) => ({ id: "lucide-" + n, name: n, category: "icon", type: "lucide", url_or_code: "", tags: [] }));
    return [...own, ...builtIn];
  }, [lib, cat, term, iconNames]);

  const pickIcon = (name: string) => {
    const svg = renderToStaticMarkup(createElement((icons as any)[name], { size: 24 }));
    onPick(`এই আইকন ব্যবহার করো (${name}): ${svg}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="অ্যাসেট খুঁজুন..." className="min-h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          {CATS.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`min-h-11 rounded-lg px-2 text-xs ${cat === c.id ? "bg-primary text-primary-foreground" : "glass"}`}>{c.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!list.length && <p className="py-10 text-center text-sm text-muted-foreground">কোনো অ্যাসেট পাওয়া যায়নি</p>}
        <div className={`grid gap-2 ${cat === "icon" ? "grid-cols-5 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3"}`}>
          {list.slice(0, limit).map((a) =>
            a.type === "lucide" ? (
              <button key={a.id} title={a.name} onClick={() => pickIcon(a.name)} className="glass grid aspect-square min-h-12 place-items-center rounded-lg transition hover:scale-110 hover:border-primary">
                {createElement((icons as any)[a.name], { className: "size-5" })}
              </button>
            ) : (
              <button key={a.id} onClick={() => onPick(snippet(a))} className="group glass overflow-hidden rounded-xl p-1.5 text-left transition hover:border-primary">
                <Lazy className="aspect-video overflow-hidden rounded-lg transition group-hover:scale-105"><Preview a={a} /></Lazy>
                <p className="mt-1 line-clamp-1 px-1 text-xs">{a.name}</p>
              </button>
            ),
          )}
        </div>
        {list.length > limit && (
          <button onClick={() => setLimit((l) => l + 120)} className="glass mt-3 min-h-11 w-full rounded-xl text-sm">আরও দেখুন ({list.length - limit})</button>
        )}
        <p className="mt-3 text-center text-[11px] text-muted-foreground">ক্লিক করলে অ্যাসেটটি বার্তায় যোগ হবে, তারপর পাঠান</p>
      </div>
    </div>
  );
}
