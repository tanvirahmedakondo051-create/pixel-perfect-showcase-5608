# Payment fix + fast VPS hosting + custom domain nameservers

## 1. Fix the AuraPay error ("পেমেন্ট সিস্টেম সেটআপে সমস্যা আছে")

Root cause (confirmed): AuraPay's official WordPress plugin sends requests in a different format from ours. With your saved key and the plugin's format, AuraPay returned a working payment link. So your key is fine. Our request format was wrong.

Changes:
- Send the key in the `API-KEY` header.
- Use AuraPay's field names: `cus_name`, `cus_email`, `amount`, `metadata`, `success_url`, `cancel_url`, `webhook_url`.
- Verify payments with `transaction_id`, which AuraPay sends to the webhook or adds to the return link as `transactionId`. Turn the plan on only when the status is `COMPLETED`, the amount matches, and the payment ID in metadata matches our record.
- Payment success page: read `transactionId` from the link, verify it and show the result.
- Earlier failed payment records stay as history.

## 2. Fast hosting for published sites on your VPS

How it will work:

```text
Visitor -> customer's domain -> your VPS (nginx + cache) -> Hexa AI app -> site HTML
```

- Published sites will load as plain, ready-made HTML, without the app shell or iframe. This makes them much faster.
- The response includes cache rules, so your VPS (and browsers) can keep a copy for a short time. When a site is updated or its package ends, the next request picks up the change.
- The app recognises which site to show from the domain name (the custom domain or `name.yourdomain.com`), plus the existing `/s/name` link.
- Admin → সেটিংস will show a ready-to-copy nginx setup for your VPS. It includes caching, gzip and passing the original domain through.
- The 7-day warning and "ওয়েবসাইটটি বন্ধ আছে" page keep working the same way.

## 3. Nameserver settings in admin

Admin → সেটিংস → new "হোস্টিং ও ডোমেইন" section:
- Nameserver 1, Nameserver 2 (optional 3 and 4)
- VPS server IP
- Main hosting domain for free subdomains (optional)

## 4. Custom domain for users

In the builder, on the publish menu: "কাস্টম ডোমেইন যোগ করুন". This only appears if the user's plan allows custom domains.
- The user types a domain, for example `myshop.com`.
- The app shows the admin's nameservers with copy buttons and a short Bangla guide for changing them at the domain provider.
- "যাচাই করুন" button: the server looks up the domain's public nameservers and compares them with the admin's list.
- Status badge: অপেক্ষমাণ (pending), সংযুক্ত (connected), or ভুল নেমসার্ভার (wrong nameservers), with the nameservers it actually found.
- Pending domains are re-checked automatically when the user opens the dashboard. A domain is only served after it shows as connected.
- One domain can belong to only one project.
- Admin → মডারেশন gets a list of all custom domains with their status.

## Things you need to do on the VPS (one time)

- Run a DNS server or panel on the VPS for your nameservers (for example cPanel, CyberPanel or PowerDNS), and point customer domains to the VPS IP.
- Paste the nginx setup from admin and turn on SSL (for example certbot or Caddy for automatic SSL).

The app can't control your VPS directly. It gives the exact settings and checks that nameservers are connected.

## Technical details

- `plan.server.ts`: `auraCreate`/`auraVerifyAndApply` use header `API-KEY` and body `{transaction_id}`; parse `metadata` (it comes back as a JSON string); look up our row by `metadata.payment_id`. Update `aurapay.functions.ts`, `aurapay-webhook.ts` (reads `transaction_id` from JSON body or `transactionId` query) and `payment.success.tsx`.
- Migration: add `ns1..ns4`, `server_ip`, `hosting_domain` to `site_settings`. Add to `projects`: `custom_domain text unique`, `domain_status text default 'pending'`, `domain_checked_at timestamptz`, `domain_found_ns text[]`. Add `custom_domain` to the `guard_project_fields` exceptions so owners can set it but not `domain_status`. Status is changed only through the server.
- New server route `src/routes/api/public/site.ts`: resolves the site by `X-Forwarded-Host`/`Host` → custom domain (connected only) or subdomain under `hosting_domain`. Returns raw HTML with badge/grace banner injected and `Cache-Control: public, max-age=60, stale-while-revalidate=300`. `/s/$subdomain` also serves the same raw HTML.
- `checkDomain` server fn: DNS-over-HTTPS NS lookup (`cloudflare-dns.com/dns-query?type=NS`, with Google DNS as fallback). Normalise trailing dots and case, and match it against the configured NS set. Plan permission `allow_custom_domain` is enforced on the server.
- Admin settings shows a generated nginx config with `proxy_cache`, `proxy_set_header X-Forwarded-Host $host` and an upstream pointing to the published app URL.
