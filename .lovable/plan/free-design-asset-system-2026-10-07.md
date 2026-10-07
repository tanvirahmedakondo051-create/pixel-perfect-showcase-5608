# Free Design Asset System

Make every AI-built site use real free assets (icons, photos, animations, backgrounds) instead of emoji and plain colors — with fallbacks and license info.

## What users/admin will see

**Admin → অ্যাসেট** (3 new tabs next to the existing library)
- **ছবি (Curated Photos):** add/edit/delete, on/off, category (hero-business/technology/creative/nature/abstract, team, food, product, office, lifestyle), URL, alt text, tags, preview, source + license.
- **Lottie অ্যানিমেশন:** same controls with JSON URL + title; categories hero, loading_success, business_technology, fun_celebration; live preview.
- **Iconify ফেভারিট:** add by set + name (mdi, lucide, ph, tabler, carbon), preview, search, on/off.

**Admin → সেটিংস:** Pexels API key (masked, server-only) with সেভ and "কানেকশন টেস্ট".

**Generated sites:** Iconify/Lordicon SVG icons instead of emoji, topic-matched photos with alt text, a Lottie in hero/CTA only where it fits, subtle Haikei-style inline SVG waves/blobs, scroll-reveal + hover, reduced-motion respected, and no broken images (fallbacks).

## Starter content
- ~30 Unsplash photos seeded — only URLs I verify load (checked one by one before saving); none invented. Unsplash License (free commercial, no attribution required) stored per row.
- Lottie: seed only animations whose JSON URL loads and whose license is verifiable (LottieFiles free/Lottie Simple License). If I can't verify ~20, I seed fewer and tell you — admin can add more.
- ~40 Iconify favorites across the 5 sets.

## How the AI uses it
1. Before writing a new site, the server picks assets by topic (skill pack + prompt keywords): 4–6 photos, 0–1 Lottie, icon suggestions. If a Pexels key exists, it searches Pexels server-side and caches results; otherwise uses curated photos.
2. Only the chosen assets go into the prompt (small list, not the whole library) — keeps coins low.
3. A new "Design Assets" rule block is added to the always-on design-quality instructions (icons, images, backgrounds, animation, fallbacks, license).
4. After generation, a cleanup pass injects only the scripts actually used (Lottie player, Lordicon), adds `loading="lazy"`, width params on Unsplash/Pexels URLs, and a tiny fallback script: broken image → gradient, failed Lottie → hidden container, failed Iconify → hidden icon.

## Technical details
- New tables (with GRANTs + RLS: public read of enabled rows, admin write via `has_role`): `curated_photos(id, category, url, alt, tags, enabled, source, source_url, license, attribution_required, created_at)`, `curated_lotties(id, category, json_url, title, tags, enabled, source, source_url, license, attribution_required, created_at)`, `icon_favorites(id, icon_set, name, tags, enabled, created_at)`, `pexels_cache(query, results jsonb, created_at)` (service-role only).
- Pexels key stored in `app_secrets` (name `pexels_api_key`); save/test via admin server functions in `admin.functions.ts`; search in a new `assets.server.ts`, 7-day cache.
- Asset selection + prompt block in `generate.ts` (new builds only; edits unchanged); post-process in the existing HTML cleanup.
- Seed via migration with literal INSERTs after verifying each URL with curl.
- Existing builder asset popover untouched; Iconify icons also usable there later if wanted.

## Not included
- No paid services. Lordicon only via its free CDN icons. Haikei is a design style reference only — backgrounds are generated inline, nothing downloaded from it.
