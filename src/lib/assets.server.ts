/** Free design asset selection (curated photos, Lottie, Iconify, optional Pexels) + post-processing for generated sites. */

type Photo = { url: string; alt: string; category: string; tags: string[] };

const SLUG_CATS: Record<string, string[]> = {
  shop: ["product", "lifestyle"], ecommerce: ["product", "lifestyle"],
  restaurant: ["food"], food: ["food"],
  portfolio: ["hero-creative", "hero-abstract"], blog: ["lifestyle", "hero-nature"],
  agency: ["hero-business", "office", "team"], coaching: ["office", "team", "hero-business"],
};
const KEYWORDS: [RegExp, string[]][] = [
  [/দোকান|শপ|shop|store|product|পণ্য|ecommerce/i, ["product", "lifestyle"]],
  [/রেস্টুরেন্ট|খাবার|ক্যাফে|restaurant|food|cafe|menu/i, ["food"]],
  [/পোর্টফোলিও|portfolio|designer|ডিজাইনার|শিল্পী|art/i, ["hero-creative", "hero-abstract"]],
  [/saas|software|সফটওয়্যার|অ্যাপ|app|tech|টেক|ai\b/i, ["hero-technology", "hero-abstract"]],
  [/এজেন্সি|agency|কোম্পানি|company|corporate|ব্যবসা|business/i, ["hero-business", "office"]],
  [/কোচিং|স্কুল|coaching|school|course|কোর্স/i, ["office", "team"]],
  [/ট্রাভেল|ভ্রমণ|travel|tour|nature|প্রকৃতি/i, ["hero-nature", "lifestyle"]],
  [/জিম|fitness|gym|health|স্বাস্থ্য/i, ["lifestyle"]],
];

function pickCats(prompt: string, slug?: string | null) {
  const cats = new Set<string>();
  if (slug && SLUG_CATS[slug]) SLUG_CATS[slug].forEach((c) => cats.add(c));
  for (const [re, c] of KEYWORDS) if (re.test(prompt)) c.forEach((x) => cats.add(x));
  if (!cats.size) ["hero-business", "hero-abstract"].forEach((c) => cats.add(c));
  cats.add("team");
  return [...cats];
}

const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

export async function getPexelsKey(db: any): Promise<string | null> {
  const { data } = await db.from("app_secrets").select("value").eq("name", "pexels_api_key").maybeSingle();
  return data?.value || null;
}

export async function pexelsSearch(db: any, key: string, query: string): Promise<Photo[]> {
  const q = query.toLowerCase().trim().slice(0, 60);
  const { data: hit } = await db.from("pexels_cache").select("results, created_at").eq("query", q).maybeSingle();
  if (hit && Date.now() - new Date(hit.created_at).getTime() < 7 * 864e5) return hit.results as Photo[];
  const r = await fetch(`https://api.pexels.com/v1/search?per_page=6&query=${encodeURIComponent(q)}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("pexels " + r.status);
  const j: any = await r.json();
  const results: Photo[] = (j.photos ?? []).map((p: any) => ({ url: p.src?.large2x || p.src?.large, alt: p.alt || q, category: "pexels", tags: [q] })).filter((p: Photo) => p.url);
  await db.from("pexels_cache").upsert({ query: q, results, created_at: new Date().toISOString() });
  return results;
}

/** English search term for Pexels from the pack/keywords. */
function pexelsQuery(cats: string[]) {
  const map: Record<string, string> = { product: "product photography", food: "restaurant food", "hero-creative": "creative studio", "hero-technology": "technology", "hero-business": "modern business", office: "modern office", "hero-nature": "nature landscape", lifestyle: "lifestyle people" };
  return map[cats.find((c) => map[c]) ?? "hero-business"];
}

export async function selectAssets(db: any, prompt: string, slug?: string | null) {
  const cats = pickCats(prompt, slug);
  const [{ data: photos }, { data: lotties }, { data: icons }] = await Promise.all([
    db.from("curated_photos").select("url, alt, category, tags").eq("enabled", true).in("category", cats),
    db.from("curated_lotties").select("json_url, title, category, tags").eq("enabled", true),
    db.from("icon_favorites").select("icon_set, name, tags").eq("enabled", true).limit(60),
  ]);
  let picked: Photo[] = [];
  const key = await getPexelsKey(db).catch(() => null);
  if (key) picked = (await pexelsSearch(db, key, pexelsQuery(cats)).catch(() => [])).slice(0, 4);
  const curated = shuffle((photos ?? []) as Photo[]);
  const team = curated.filter((p) => p.category === "team").slice(0, 2);
  picked = [...picked, ...curated.filter((p) => p.category !== "team")].slice(0, 4).concat(team);

  const lot = ((lotties ?? []) as any[]);
  const lottie = shuffle(lot.filter((l) => l.tags.some((t: string) => prompt.toLowerCase().includes(t)) || l.category === "hero"))[0] ?? null;
  const iconList = ((icons ?? []) as any[]).map((i) => `${i.icon_set}:${i.name}`).join(", ");

  const w = (u: string) => (/images\.unsplash\.com/.test(u) && !/[?&]w=/.test(u) ? `${u}?auto=format&fit=crop&w=1600&q=75` : u);
  return `\n\nFREE DESIGN ASSETS (licensed for free commercial use — use these, never invent image URLs):
PHOTOS (use the most relevant; every <img> needs descriptive alt, loading="lazy" except the hero, object-fit:cover):
${picked.map((p) => `- ${w(p.url)} — ${p.alt}`).join("\n") || "- (none: use gradient/SVG visuals)"}
${lottie ? `LOTTIE (optional, max one, hero or CTA only): <lottie-player src="${lottie.json_url}" background="transparent" loop autoplay style="width:100%;max-width:420px" aria-hidden="true"></lottie-player> — "${lottie.title}". Wrap it in a container with class "hx-lottie".` : ""}
ICONS: use Iconify SVG images: <img src="https://api.iconify.design/{set}:{name}.svg?color=%23HEX" width="24" height="24" alt="" aria-hidden="true" class="hx-icon">. Pick semantically. Suggested: ${iconList}. Other mdi/lucide/ph/tabler/carbon names are fine if they exist. Lordicon (<lord-icon src="https://cdn.lordicon.com/....json">) is allowed sparingly for feature/success icons.
RULES: NEVER use emoji as UI icons. Backgrounds: subtle Haikei-style inline SVG waves/blobs/layered gradients in brand colors — never downloaded background images. Hero = one strong photo OR visual background, plus Lottie only if it doesn't clutter. Scroll-reveal + hover interactions, respect prefers-reduced-motion. No irrelevant stock imagery.`;
}

const FALLBACK = `<script>(function(){document.addEventListener("error",function(e){var t=e.target;if(!t||t.tagName!=="IMG")return;if(t.classList.contains("hx-icon")){t.style.visibility="hidden";return}var d=document.createElement("div");d.setAttribute("role","img");d.setAttribute("aria-label",t.alt||"");d.style.cssText="width:100%;height:100%;min-height:"+(t.offsetHeight||200)+"px;border-radius:inherit;background:linear-gradient(135deg,rgba(99,102,241,.35),rgba(34,211,238,.25))";t.replaceWith(d)},true);setTimeout(function(){document.querySelectorAll("lottie-player").forEach(function(l){if(!l.shadowRoot||!l.shadowRoot.querySelector("svg,canvas")){var c=l.closest(".hx-lottie")||l;c.style.display="none"}})},6000);if(matchMedia("(prefers-reduced-motion: reduce)").matches)document.querySelectorAll("lottie-player").forEach(function(l){l.removeAttribute("autoplay");l.removeAttribute("loop")})})();</script>`;

/** Inject only the scripts the page uses, lazy-load images, size Unsplash URLs, add graceful fallbacks. */
export function postProcessAssets(html: string) {
  if (!/<\/body>/i.test(html)) return html;
  let s = html.replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, (m, a, off) => (off < html.search(/<main|<section/i) + 2000 && off < 4000 ? m : `<img loading="lazy" decoding="async"${a}>`));
  s = s.replace(/(https:\/\/images\.unsplash\.com\/photo-[\w-]+)(?![\w?=&-]*[?&]w=)(\?[^"'\s)]*)?/g, (_m, base, q) => `${base}${q ? q + "&" : "?"}auto=format&fit=crop&w=1600&q=75`);
  const head: string[] = [];
  if (/<lottie-player/i.test(s) && !/lottie-player\.js/i.test(s)) head.push(`<script defer src="https://unpkg.com/@lottiefiles/lottie-player@2/dist/lottie-player.js"></script>`);
  if (/<lord-icon/i.test(s) && !/lordicon\.js/i.test(s)) head.push(`<script defer src="https://cdn.lordicon.com/lordicon.js"></script>`);
  if (head.length) s = /<\/head>/i.test(s) ? s.replace(/<\/head>/i, head.join("\n") + "\n</head>") : s;
  if (!s.includes("hx-lottie\")||l")) s = s.replace(/<\/body>(?![\s\S]*<\/body>)/i, FALLBACK + "\n</body>");
  return s;
}
