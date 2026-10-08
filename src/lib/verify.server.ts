/** Post-build checks for generated HTML sites: pages, menu links, empty sections, broken images. Auto-fixes what it safely can. */

export type VerifyReport = { pages: number; links: number; brokenLinks: number; emptySections: number; images: number; fixedImages: number; brokenImages: number; qa?: string; requested?: number; missingPages?: string[]; emojiReplaced?: number; loginButton?: "ok" | "added" | "na" };

const pageNames = (html: string) => [...new Set([...html.matchAll(/data-page=["']([\w-]+)["']/g)].map((m) => m[1].toLowerCase()))];

async function urlOk(url: string) {
  try {
    let r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "follow" });
    if (r.status === 405 || r.status === 403) r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000), headers: { Range: "bytes=0-0" } });
    return r.ok || r.status === 206;
  } catch { return false; }
}

export async function verifySite(db: any, html: string, appOrigin: string): Promise<{ html: string; report: VerifyReport }> {
  let out = html;
  const pages = pageNames(out);
  // Menu links to pages that don't exist → send them home instead of a blank page.
  let links = 0, brokenLinks = 0;
  if (pages.length) {
    out = out.replace(/href=(["'])#\/([\w-]*)\1/g, (m, q, name) => {
      links++;
      if (!name || pages.includes(name.toLowerCase())) return m;
      brokenLinks++;
      return `href=${q}#/${q}`;
    });
  }
  // Empty sections (no text, image, icon or form inside).
  let emptySections = 0;
  for (const m of out.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)) {
    const inner = m[1];
    const text = inner.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").trim();
    if (text.length < 3 && !/<(img|svg|iframe|video|form|lottie-player|canvas|iconify-icon)/i.test(inner)) emptySections++;
  }
  // Images: check unique external URLs, swap broken ones for library photos.
  const urls = [...new Set([...out.matchAll(/<img\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]))].slice(0, 24);
  const own = (u: string) => u.startsWith(appOrigin + "/uploads/");
  const results = await Promise.all(urls.map(async (u) => [u, own(u) ? true : await urlOk(u)] as const));
  const bad = results.filter(([, ok]) => !ok).map(([u]) => u);
  let fixedImages = 0;
  if (bad.length) {
    const { data } = await db.from("curated_photos").select("url").eq("enabled", true).limit(60);
    const pool = ((data ?? []) as { url: string }[]).map((p) => p.url).filter((u) => !bad.includes(u) && !urls.includes(u));
    for (const u of bad) {
      const rep = pool.shift();
      if (!rep) break;
      out = out.split(u).join(rep);
      fixedImages++;
    }
  }
  return { html: out, report: { pages: pages.length, links, brokenLinks, emptySections, images: urls.length, fixedImages, brokenImages: bad.length - fixedImages } };
}

const bnNum = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export function reportText(r: VerifyReport) {
  const ok: string[] = [];
  if (r.pages) ok.push(`${bnNum(r.pages)}টি পেজ`);
  if (r.links) ok.push(`${bnNum(r.links - r.brokenLinks)}টি মেনু লিংক ঠিক আছে`);
  if (r.images) ok.push(`${bnNum(r.images - r.fixedImages - r.brokenImages)}টি ছবি লোড হচ্ছে`);
  const fixes: string[] = [];
  if (r.brokenLinks) fixes.push(`${bnNum(r.brokenLinks)}টি ভাঙা লিংক হোমে পাঠানো হয়েছে`);
  if (r.fixedImages) fixes.push(`${bnNum(r.fixedImages)}টি ছবি বদলানো হয়েছে`);
  const warn: string[] = [];
  if (r.brokenImages) warn.push(`${bnNum(r.brokenImages)}টি ছবি লোড হয়নি`);
  if (r.emptySections) warn.push(`${bnNum(r.emptySections)}টি খালি অংশ`);
  let t = `🔎 চেক রিপোর্ট: ✅ ${ok.join(" • ") || "সব ঠিক আছে"}`;
  if (fixes.length) t += `\n🛠️ ${fixes.join(" • ")}`;
  if (warn.length) t += `\n⚠️ ${warn.join(" • ")}`;
  if (r.requested) t += `\n📄 পেজ: ${bnNum(r.requested - (r.missingPages?.length ?? 0))}/${bnNum(r.requested)} ${r.missingPages?.length ? "⚠️ বাকি: " + r.missingPages.join(", ") : "✅"}`;
  if (r.loginButton === "ok") t += `\n🔐 লগইন বাটন: ✅`;
  else if (r.loginButton === "added") t += `\n🔐 লগইন বাটন: ❌ ছিল না — যোগ করা হয়েছে`;
  if (r.emojiReplaced) t += `\n🎨 ${bnNum(r.emojiReplaced)}টি ইমোজি আইকনে বদলানো হয়েছে`;
  if (r.qa) t += `\n${r.qa}`;
  return t;
}

/** Pages the user asked for (from prompt/plan text). Returns data-page names. */
const PAGE_WORDS: [RegExp, string][] = [
  [/হোম|home/i, "home"], [/আমাদের সম্পর্কে|সম্পর্কে|about/i, "about"], [/যোগাযোগ|contact/i, "contact"],
  [/মেনু|menu/i, "menu"], [/সার্ভিস|সেবা|services?/i, "services"], [/গ্যালারি|gallery/i, "gallery"],
  [/ব্লগ|blog/i, "blog"], [/প্রাইসিং|মূল্য তালিকা|pricing/i, "pricing"], [/টিম|team/i, "team"],
  [/faq|প্রশ্নোত্তর/i, "faq"], [/দোকান|shop|products?|পণ্য/i, "shop"], [/পোর্টফোলিও|portfolio|projects/i, "portfolio"],
];
export function requestedPages(text: string): string[] {
  if (!/পেজ|পেইজ|page|পাতা/i.test(text)) return [];
  const out = new Set<string>();
  // Look near the word "page" to avoid picking up section names.
  const windows = [...text.matchAll(/[^\n।.]{0,120}(পেজ|পেইজ|pages?|পাতা)[^\n।.]{0,60}/gi)].map((m) => m[0]).join(" ");
  for (const [re, n] of PAGE_WORDS) if (re.test(windows)) out.add(n);
  if (out.size === 0) return [];
  out.add("home");
  return out.size >= 2 ? [...out] : [];
}

export function hasLoginButton(html: string) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  return /hexaDB\.(login|signup|loginWithGoogle)|data-hx-login/.test(html) || /<(a|button)\b[^>]*>[^<]*(?:<[^>]+>[^<]*)*?(লগইন|লগ ইন|সাইন ইন|সাইন আপ|login|log in|sign in|sign up)/i.test(body);
}

/** Small header login button + popup using the built-in hexaDB helper. */
export function injectLoginButton(html: string) {
  const ui = `<div data-hx-login style="position:fixed;top:14px;right:14px;z-index:9999;font-family:inherit"><button type="button" id="hxLoginBtn" style="min-height:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(15,10,30,.75);color:#fff;backdrop-filter:blur(10px);cursor:pointer;font:inherit">লগইন</button></div><dialog id="hxLoginDlg" style="border:0;border-radius:16px;padding:24px;width:min(92vw,360px);font-family:inherit"><form method="dialog" id="hxLoginForm" style="display:grid;gap:10px"><h3 style="margin:0 0 6px">লগইন</h3><input name="e" type="email" required placeholder="ইমেইল" style="min-height:44px;padding:0 12px;border:1px solid #ccc;border-radius:10px"><input name="p" type="password" required placeholder="পাসওয়ার্ড" style="min-height:44px;padding:0 12px;border:1px solid #ccc;border-radius:10px"><button style="min-height:44px;border:0;border-radius:10px;background:#4f46e5;color:#fff">লগইন</button><button type="button" id="hxSignup" style="min-height:44px;border:1px solid #ccc;border-radius:10px;background:#fff">নতুন অ্যাকাউন্ট</button><button type="button" id="hxGoogle" style="min-height:44px;border:1px solid #ccc;border-radius:10px;background:#fff;display:flex;gap:8px;align-items:center;justify-content:center"><img src="https://api.iconify.design/logos:google-icon.svg" width="18" height="18" alt="" aria-hidden="true">Google দিয়ে লগইন</button><p id="hxLoginErr" style="color:#dc2626;margin:0;font-size:14px"></p></form></dialog><script data-hx-login>(function(){var b=document.getElementById("hxLoginBtn"),d=document.getElementById("hxLoginDlg"),f=document.getElementById("hxLoginForm"),er=document.getElementById("hxLoginErr");function db(){return window.hexaDB}function paint(){var u=db()&&db().user();b.textContent=u?(u.name||u.email||"লগআউট")+" · লগআউট":"লগইন"}b.onclick=function(){var u=db()&&db().user();if(u){db().logout();paint();return}d.showModal()};function go(p){er.textContent="";p.then(function(){d.close();paint()}).catch(function(e){er.textContent=(e&&e.message)||"লগইন ব্যর্থ"})}f.onsubmit=function(e){e.preventDefault();go(db().login(f.e.value,f.p.value))};document.getElementById("hxSignup").onclick=function(){if(f.reportValidity())go(db().signup(f.e.value,f.p.value,""))};document.getElementById("hxGoogle").onclick=function(){db().loginWithGoogle()};setTimeout(paint,50)})();</script>`;
  return html.replace(/<\/body>(?![\s\S]*<\/body>)/i, ui + "\n</body>");
}
