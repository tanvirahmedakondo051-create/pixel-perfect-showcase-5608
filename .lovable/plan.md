# Cut AI cost: simple site from ~13 coins to 3-6

## Where the coins go today
A new site is built in many separate AI calls: one to plan the sections, then one per section (4-7). Every call resends the full instructions: site-type guide, the whole asset list, backend notes. On top of that come the question step and a chat-summary call after replies. So the same instructions are paid for 6-9 times.

## What changes for users
- A simple site (portfolio, landing page) is built in **1-2 AI calls** instead of 6-9. Target: 3-6 coins.
- Pause/resume is kept, but it uses bigger steps: "header + hero + main content" first, then "the rest + footer". You can still continue from a checkpoint without paying twice.
- Small edits ("change the button color") send only the related part of the page, and the AI replies with just the change. A full rewrite happens only if the change can't be applied.
- The cost estimate before a build becomes more accurate.
- Admin → লিমিট gets a toggle: "ছোট সাইট এক ধাপে বানাও" (on by default).

## Technical details
- `generate.ts` staged build:
  - Merge the outline into the first step (ask for a short section list + full HTML in one reply), so no separate outline call. Fall back to default steps if no list comes back.
  - Simple prompts (short, no backend, no images, ≤5 sections): one full-HTML call. Others: at most 2-3 grouped steps, not one per section.
  - Follow-up steps get a smaller system prompt: core rules + the existing `<head>` CSS class list (not the full head), no asset catalogue, no skill pack text repeated.
- System prompt trimming: the asset list becomes a short name index (top ~15 that match the prompt) instead of the full catalogue. Skill pack text is sent only on the first build call.
- Diff edits (`context.server.ts`): smaller snippet window, outline capped, recent chat limited to the last 2 user messages, summary only. If the patch fails, retry the diff once with a wider context before rewriting the full site.
- Fewer retries: React auto-fix 2 → 1 retry; failing over to another provider only on network/5xx errors, not on bad output; no full-HTML fallback after a successful staged build.
- Skip the question step when the prompt is ≥ ~12 words or the project has a skill pack plus a name. Run the chat summary every 6 messages, not after every reply, on a smaller `max_tokens`.
- Lower the output cap on section/diff calls (e.g. 4k diff, 8k full), still capped by the admin `max_output_tokens` setting.
- Log the input and output tokens of each call in `usage_logs` so the admin can see the savings; run a real test build and compare coins before and after.
