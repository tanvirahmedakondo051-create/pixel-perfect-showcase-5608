# Fully automatic custom domain DNS

Goal: when a user adds a custom domain, your VPS creates the DNS for it by itself. The user only changes the nameservers at their domain provider, and nothing else.

## What the user will see
- Adds `myshop.com`, then sees your nameservers with copy buttons, as they do today.
- Behind the scenes your VPS creates the domain's DNS right away. The domain and `www` point to your VPS IP.
- Once the nameservers are connected, the site goes live with SSL automatically.
- Removing the domain, or permanent deletion after the plan expires, also removes its DNS.

## Changes

1. **Deploy agent:** add two new actions, `/dns-add` and `/dns-remove`, based on your code with some safety fixes:
   - The domain is checked strictly before use.
   - Commands run with `execFile` and a fixed argument list, never a shell string. Your version passed the domain inside a shell command, which could let someone run their own commands on your server.
   - Removal goes through a helper script (`hexa-dns-remove`) instead of a raw `sed`.
2. **Installer:** installs PowerDNS (bind-zone mode) and creates `/usr/local/bin/hexa-dns-add` and `hexa-dns-remove`. Each new zone gets SOA and NS records (your ns1/ns2), A records for `@` and `www` pointing to your VPS IP, and a reload of PowerDNS. Port 53 is opened in the firewall.
3. **App:**
   - Adding or changing a custom domain calls `/dns-add`. Removing it calls `/dns-remove`.
   - Plan-expiry deletion also calls `/dns-remove`.
   - The domain box shows the state as "DNS তৈরি হয়েছে ✅" or "DNS তৈরি ব্যর্থ — আবার চেষ্টা করুন".
4. **Admin settings:** a short note that the install command needs to be run again to get DNS support.

## Things you need to do once
- At your registrar, create "glue" records: `ns1.yourdomain` and `ns2.yourdomain` pointing to your VPS IP.
- Run the install command again on the VPS.

## Technical details
- New column `projects.dns_status` (`none|ok|error`), written only by server functions.
- `deploy.server.ts` gets `dnsAdd(db, domain)` and `dnsRemove(db, domain)` wrappers. These are skipped silently when no agent is configured, which matches the deploy pattern.
- The helper scripts read NS and IP from `/etc/hexa/dns.env`, which the installer writes from new installer arguments for ns1, ns2 and IP.
