# 3 fixes: https job address, Framer Motion, design rules

## 1. Builds failing on hexarly.com (critical)
- `origin.server.ts`: read `x-forwarded-proto` (and `x-forwarded-host`) so requests behind nginx report `https://`.
- `generate.ts`: after computing the job origin, if it starts with `http://` and isn't localhost/127.0.0.1, upgrade to `https://`. Apply the same at line ~285 where origin is used.
- Log `origin` + `jobId` when a job is created.
- One-time data fix: existing queued/running jobs with `http://` origin (non-localhost) updated to `https://`.

## 2. Framer Motion in React builds
- `REACT_RULE`: add `"framer-motion"` to required package.json deps; instruct: scroll reveal with `whileInView` + `viewport={{ once: true }}`, stagger children via variants, `whileHover`/`whileTap` on buttons/cards, `AnimatePresence` for page/route transitions, `useReducedMotion()` to disable motion.

## 3. Design-quality skill pack
- Append a "Hard numbers" section to the `design-quality` row: type scale (display 48-72px, section 32-40px, body 16-18px, line-height 1.5-1.7, max 2 families), 8px spacing grid, section padding 96-128px desktop / 64px mobile, 60-30-10 colour rule, contrast min 4.5:1, buttons min 44px tall with 16px+ padding and clear hover, cards radius 12-16px, subtle shadow, hover lift 4-8px.
- Done as a data update; also saved as a safe-to-rerun SQL file in `supabase/migrations/`.
