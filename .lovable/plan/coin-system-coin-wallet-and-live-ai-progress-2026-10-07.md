# Coin system, coin wallet and live AI progress

## What users will see

**1. Live progress card (builder)**
- While AI works, a card appears in chat: current step ("বিশ্লেষণ করছি..." → "HTML লিখছি..." → "লেআউট ঠিক করছি..."), live coin/token counter, elapsed timer (২ মি ৩৫ সে), moving progress bar.
- No update for 30 seconds: "AI এখনো কাজ করছে, একটু অপেক্ষা করুন 🙏" + বাতিল button (stops the request; only used tokens are charged).
- On finish: "✅ ৩ মি ১২ সে-তে শেষ • ১.৮ কয়েন". Summary stays on that message.

**2. Coins everywhere (1 coin = 10,000 tokens by default)**
- Header always shows "🪙 ২৪" wallet chip (opens history).
- Dashboard, builder and pricing show coins instead of tokens.
- Admin → Settings: "কত টোকেনে ১ কয়েন" field.

**3. Wallet + plans**
- Free: 10 coin signup bonus, +1/day, cap 15.
- Lite ৳100: +60 on purchase, +2/day, cap 30.
- Pro ৳499: +300 on purchase, +5/day, cap 60.
- Purchase coins are added on top (not capped); daily refill only tops up to the cap, never above.
- Out of coins: "🪙 কয়েন শেষ! কাল আবার পাবেন, অথবা আপগ্রেড করুন" + pricing link; generating is blocked.
- Dashboard → "🪙 হিস্টোরি": date, + / − amount, reason (bonus, refill, purchase, spend).
- Pricing page redesigned to compare plans by coins (10 + ১/দিন, 60 + ২/দিন, 300 + ৫/দিন) with "≈ ১-২ কয়েন = ১টি সাইট" hint.
- Admin plan editor gets: signup/purchase coins, daily refill, cap. The old daily token limit is replaced by coins.

## Technical details

- Migration:
  - `profiles.coins numeric(10,2) default 0`; `plans.bonus_coins`, `daily_coins`, `coin_cap` (int); `site_settings.tokens_per_coin int default 10000`.
  - `coin_transactions(id, user_id, amount numeric, type text check bonus/refill/purchase/spend, reason, created_at)` with GRANTs, RLS: users read own; writes only via server (service role / security-definer fns).
  - Security-definer `add_coins(user, amount, type, reason)` and `spend_coins(...)` keep balance + log atomic; revoke from authenticated.
  - Extend `guard`-style trigger so users cannot update `profiles.coins` directly.
  - `handle_new_user` grants default plan's `bonus_coins` + logs bonus. Backfill existing users with their plan's bonus.
  - Seed plan values via data update (Free 10/1/15, Lite 60/2/30, Pro 300/5/60) matched by price.
- Generation (`generate.ts`): pre-check `coins > 0`; stream extra NDJSON events `{type:"progress", step, tokens}` (step derived from output: analysing before first chunk, "HTML লিখছি" once `<html`/`<body` seen, "ঠিক করছি" for patch blocks; tokens estimated from chars until provider usage arrives). On finish/abort: `spend_coins(tokens / tokens_per_coin)` and send `{type:"done", tokens, coins, ms}`.
- Builder: `ProgressCard` component parses these events; 30s idle timer; Cancel uses existing AbortController.
- Purchase: AuraPay webhook/verify path calls `add_coins(plan.bonus_coins,'purchase')` once per payment (idempotent on payment id).
- Daily refill: pg_cron at 18:00 UTC (= 00:00 Dhaka) → `/api/public/cron/refill` (auth via existing cron token) running one SQL fn: `coins = least(cap, coins + daily)` only where `coins < cap`, logging refill rows.
- `useProfile` returns coins; new `CoinChip` in `AppHeader`/`SiteHeader`; remove `tokensToday` UI usage (keep column for analytics).
- Record coin-ledger rule in AGENTS.md; save plan coin values to memory.
