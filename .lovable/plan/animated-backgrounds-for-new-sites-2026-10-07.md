# Animated backgrounds for new sites

## What users will see
- Every new site's top section gets a slowly moving colour background instead of one flat colour. It can be a Stripe-style soft colour cloud, or a gently shifting gradient.
- Colours follow each site's own colour scheme, so a restaurant and a portfolio look different.
- Visitors whose phone or computer is set to "reduce motion" see the same colours without any movement.
- Pages stay fast: plain styling only, no extra downloads.

## What gets built
1. **Mesh gradient style** ("hx-mesh"): 3-4 blurred colour blobs that drift slowly behind the top section. Colours come from the site's own colour settings, with sensible defaults.
2. **Moving gradient style** ("hx-gradient"): a large gradient that slides slowly (about 15-20 seconds per loop). It can be used on the top section or on call-to-action strips.
3. **AI instruction:** the top section must use one of these two styles (or its own animated gradient), never a single flat colour. The text must stay easy to read on top of it. This becomes part of the premium quality rules.
4. **Added only when used:** the styling is placed into a site only if the page actually uses these styles, just like the photo and animation helpers.
5. **Our own home page:** the floating colour blobs at the top get the same "reduce motion" support.

## Technical details
- `src/lib/assets.server.ts`: add `ANIMATED_BG_CSS` (about 1.5KB): `.hx-mesh` (absolute inset, `isolation`, 3-4 `::before/::after` plus child `span` blobs using radial-gradients, `filter: blur`, `@keyframes hx-drift` transforms only), `.hx-gradient` (`background-size: 300% 300%`, `@keyframes hx-shift` on background-position). Colours use `var(--hx-c1..c4, fallback)`. `@media (prefers-reduced-motion: reduce) { animation: none }`.
- `postProcessAssets`: if the HTML contains `hx-mesh` or `hx-gradient` and the CSS isn't already there, inject one `<style data-hx-bg>` into `<head>`.
- `generate.ts`: add a short usage note to the PREMIUM rule and the build system prompt with the exact markup (`<div class="hx-mesh"><span></span><span></span></div>` inside a `position:relative` hero, set `--hx-c1..c4` from the palette, plus a readable overlay/contrast rule). Follow-up section steps get the same note so later CTA sections match.
- React projects: same note added to the React prompt, telling the AI to put the CSS in its own stylesheet (no injection there).
- `src/styles.css`: add a reduced-motion rule turning off `float-orb` for the landing page.
- Each build costs only a few hundred tokens more.
