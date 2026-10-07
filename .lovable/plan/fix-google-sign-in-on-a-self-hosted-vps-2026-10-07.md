# Fix Google sign-in on a self-hosted VPS

## Goal
Make the "গুগল দিয়ে চালিয়ে যান" button work when the app runs on your own VPS domain, and keep it working in the Lovable preview and on the published lovable.app site.

## Approach (hybrid, safer than a full swap)
- **On lovable.app and the preview:** keep the current Lovable sign-in. It is the only method that works in the preview window.
- **On any other domain (your VPS):** use the direct sign-in you gave me (`supabase.auth.signInWithOAuth` with `redirectTo: origin + "/login"`). The browser goes to Google and comes back to /login. The page already sends signed-in users on to the dashboard.
- Show the busy state on the button while it runs, and show the Bangla error toast if it fails.

## Important: what you need to set up
The direct method only works once the login service knows about your Google app and your domain:
1. Create your own Google OAuth Client ID and Secret in Google Cloud Console.
2. Enter them in Cloud → Users → Auth Settings → Google.
3. Add `https://your-vps-domain/login` to the allowed redirect URLs.
4. In Google Cloud Console, add the login service's callback URL as an authorized redirect URI. I'll give you the exact URL after the change.

If you skip these steps, the button on your VPS will show "Unsupported provider" or a redirect error. That comes from missing setup, not from the code.

## Technical details
- File: `src/components/site/AuthCard.tsx`, the `google()` function only.
- Detect with `location.hostname.endsWith(".lovable.app")` or a hostname containing `lovableproject.com` → use the broker. Otherwise → direct `supabase.auth.signInWithOAuth`.
- No other files change. The /login page's existing `useSession` redirect handles what happens after sign-in.
