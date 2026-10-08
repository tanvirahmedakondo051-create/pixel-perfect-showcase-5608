ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS qa_screenshots boolean NOT NULL DEFAULT true;

INSERT INTO public.skill_packs (slug, name_bn, icon, system_prompt, is_active, sort_order)
SELECT 'taste', 'টেস্ট (প্রিমিয়াম পলিশ)', '✨', $p$
TASTE — PREMIUM PRODUCT POLISH (Stripe / Linear / Vercel level). Apply on top of the site type:
1. Restraint first: one dominant neutral surface, one confident brand color, one accent. Never rainbow sections.
2. Big, confident type: tight display headings (letter-spacing -0.02em), calm body text, clear hierarchy in 3 sizes max per section.
3. Whitespace is a feature: generous section padding, max content width ~1200px, short line length (60-75ch).
4. Hairline borders (1px, low-opacity) and soft layered shadows instead of heavy drop shadows.
5. Precise grids: align everything to a 12-column / 8px rhythm; equal gutters; no random offsets.
6. Real product feel: show UI-like mockups, stat strips, logo rows, feature panels, comparison tables — not generic icon+text cards repeated.
7. Vary layouts: alternate split, bento, timeline, marquee and full-bleed bands; never 3 identical card grids in a row.
8. Micro-interactions: 150-250ms ease-out hovers, subtle lift (2-6px), border/glow highlight, underline slide on links, button press scale 0.98.
9. Depth through light: subtle gradient glows behind key visuals, grain or grid backdrops at very low opacity.
10. Specific copy: concrete Bangla headlines with numbers and outcomes; no vague claims.
11. Consistent radius scale, icon stroke and size, and button styles (primary solid, secondary ghost).
12. Dark sections: never pure black; deep tinted neutrals with readable 4.5:1 contrast.
13. Footer and nav are product-grade: clear groups, small muted text, active states.
14. Every page of a multi-page site must be complete and as polished as home — never an empty or stub page.
$p$, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.skill_packs WHERE slug = 'taste');