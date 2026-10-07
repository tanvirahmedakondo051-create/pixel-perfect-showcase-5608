# Quality first: rich, professional sites again

## What changes for users
- New sites come out detailed and polished again, close to Lovable level. They may cost more coins, and that's accepted.
- Every new site includes:
  - A premium hero with entrance animations (staggered text, soft gradient/mesh background, a clear call-to-action)
  - 6-8 rich sections with real Bangla content depth (no 2-line filler): services with details, stats, process steps, testimonials, FAQ, contact
  - Smooth scroll-reveal animations, hover lift and glow on cards and buttons
  - Professional typography scale, generous spacing, a consistent color system
  - Polished details: icons, badges, dividers, a sticky header with blur, mobile menu, a styled footer
- Coins are still saved, but only in ways that don't hurt quality (fewer repeated instructions, smarter edits).

## How quality is restored
1. **Remove the "compact code / under 25KB" instruction** completely, from both the first build step and later steps.
2. **Add a "premium quality" rule** to every new-site build: the checklist above, plus "never minimal or bare; each section needs real content, layout variety and micro-interactions". It works together with the design-quality skill pack.
3. **Bigger builds by default:**
   - The one-step build is used only for very short requests. Its brief now asks for the full rich structure (hero + 6-8 sections), not "3-4 sections".
   - Normal sites go back to 2-3 detailed steps (header + hero + key sections, then middle sections, then testimonials/FAQ/contact/footer), each written in full depth.
   - Admin toggle "ছোট সাইট এক ধাপে বানাও" is now **off by default**.
4. **Output size:** builds use the full admin output limit. The default limit goes up from 8,000 to 16,000 so pages never get cut short.
5. **Later steps keep the full style:** they get the whole `<head>` (all CSS and animations), not a trimmed 3,500-character version, so new sections match the hero's polish.

## Smart coin saving (kept, quality-neutral)
- Small edits still change only the affected part (diff editing).
- The question step, chat summary every 6 messages, and fewer error retries stay.
- Asset list stays as a short matching index.
- Skill-pack instructions are sent once per build, not repeated on every step.

## Technical details
- `generate.ts`: delete `EFFICIENT` and its two uses; add a `PREMIUM` rule appended to `buildSystem` and to the follow-up section prompt; update step briefs (single + 3-step grouped); `complex` true unless prompt is short (<120 chars) and toggle on; `headOf` limit raised to ~12k chars and keeps `<style>` fully; remove the React prompt line "Keep the total output compact" and replace with "complete, polished UI".
- Migration: `site_settings.single_pass_simple` default false and set false; `max_output_tokens` raised to 16000 where it is below that.
- Admin → লিমিট toggle label becomes "ছোট সাইট এক ধাপে বানাও (কম কয়েন, কম ডিটেইল)".
- Update the cost estimate to reflect the larger builds.
