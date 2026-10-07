#!/usr/bin/env node
// Hexa AI deploy agent — runs on your VPS, receives signed deploy requests from Hexa AI,
// writes static sites to /var/www/sites/{domain}/index.html, creates nginx vhosts and SSL.
// No npm packages needed. Config via env: HEXA_TOKEN, HEXA_AGENT_HOST, HEXA_PORT (8443), HEXA_EMAIL.
"use strict";
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

const TOKEN = process.env.HEXA_TOKEN || "";
const HOST = process.env.HEXA_AGENT_HOST || "";
const PORT = Number(process.env.HEXA_PORT || 8443);
const EMAIL = process.env.HEXA_EMAIL || "";
const ROOT = "/var/www/sites";
const NGINX_DIR = "/etc/nginx/sites-enabled";
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

if (!TOKEN || TOKEN.length < 16) { console.error("HEXA_TOKEN (16+ chars) is required"); process.exit(1); }

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 110000 }, (err, stdout, stderr) => (err ? reject(new Error((stderr || err.message).toString().slice(0, 500))) : resolve(stdout)));
  });
}

function verify(req, body) {
  const ts = Number(req.headers["x-hexa-timestamp"] || 0);
  const sig = String(req.headers["x-hexa-signature"] || "");
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = crypto.createHmac("sha256", TOKEN).update(`${ts}.${body}`).digest("hex");
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function vhost(domain, ssl) {
  const root = path.join(ROOT, domain);
  const common = `
    root ${root};
    index index.html;
    gzip on;
    gzip_comp_level 6;
    gzip_types text/html text/css application/javascript image/svg+xml application/json;
    location = /index.html { add_header Cache-Control "public, max-age=60, stale-while-revalidate=300"; }
    location / { try_files $uri /index.html; add_header Cache-Control "public, max-age=60, stale-while-revalidate=300"; }
    location ~* \\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?)$ { expires 30d; add_header Cache-Control "public, immutable"; }`;
  if (!ssl) return `server {\n    listen 80;\n    server_name ${domain};${common}\n}\n`;
  return `server {\n    listen 80;\n    server_name ${domain};\n    location /.well-known/acme-challenge/ { root ${root}; }\n    location / { return 301 https://$host$request_uri; }\n}\nserver {\n    listen 443 ssl;\n    http2 on;\n    server_name ${domain};\n    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;${common}\n}\n`;
}

async function deploy({ domain, html, ssl }, step) {
  if (!DOMAIN_RE.test(domain)) throw new Error("invalid domain");
  if (typeof html !== "string" || html.length > 5_000_000) throw new Error("invalid html");
  step({ step: "uploading" });
  const dir = path.join(ROOT, domain);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html.tmp"), html);
  fs.renameSync(path.join(dir, "index.html.tmp"), path.join(dir, "index.html"));
  step({ step: "nginx" });
  const conf = path.join(NGINX_DIR, `hexa-${domain}.conf`);
  const hasCert = fs.existsSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`);
  fs.writeFileSync(conf, vhost(domain, hasCert));
  await run("nginx", ["-t"]);
  await run("systemctl", ["reload", "nginx"]);
  if (ssl && !hasCert) {
    step({ step: "ssl" });
    const args = ["certonly", "--webroot", "-w", dir, "-d", domain, "--non-interactive", "--agree-tos"];
    args.push(...(EMAIL ? ["-m", EMAIL] : ["--register-unsafely-without-email"]));
    try {
      await run("certbot", args);
      fs.writeFileSync(conf, vhost(domain, true));
      await run("nginx", ["-t"]);
      await run("systemctl", ["reload", "nginx"]);
    } catch (e) {
      step({ step: "ssl_failed", msg: String(e.message) });
      return { step: "live", url: `http://${domain}` };
    }
  }
  return { step: "live", url: `${fs.existsSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`) ? "https" : "http"}://${domain}` };
}

async function remove({ domain }, step) {
  if (!DOMAIN_RE.test(domain)) throw new Error("invalid domain");
  fs.rmSync(path.join(ROOT, domain), { recursive: true, force: true });
  fs.rmSync(path.join(NGINX_DIR, `hexa-${domain}.conf`), { force: true });
  await run("nginx", ["-t"]);
  await run("systemctl", ["reload", "nginx"]);
  return { step: "removed" };
}

async function handler(req, res) {
  if (req.method === "GET" && req.url === "/health") { res.end(JSON.stringify({ ok: true })); return; }
  if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 6_000_000) req.destroy(); });
  req.on("end", async () => {
    if (!verify(req, body)) { res.statusCode = 401; res.end(JSON.stringify({ error: "unauthorized" })); return; }
    res.writeHead(200, { "Content-Type": "application/x-ndjson" });
    const step = (o) => res.write(JSON.stringify(o) + "\n");
    try {
      const data = JSON.parse(body);
      const out = req.url === "/deploy" ? await deploy(data, step) : req.url === "/remove" ? await remove(data, step) : (() => { throw new Error("unknown action"); })();
      step(out);
    } catch (e) {
      step({ error: String(e.message || e) });
    }
    res.end();
  });
}

const certDir = HOST ? `/etc/letsencrypt/live/${HOST}` : "";
if (certDir && fs.existsSync(`${certDir}/fullchain.pem`)) {
  https.createServer({ cert: fs.readFileSync(`${certDir}/fullchain.pem`), key: fs.readFileSync(`${certDir}/privkey.pem`) }, handler).listen(PORT, () => console.log(`Hexa deploy agent (https) on :${PORT}`));
} else {
  console.warn("No SSL certificate found for HEXA_AGENT_HOST — running plain HTTP (not reachable from Hexa AI).");
  http.createServer(handler).listen(PORT, () => console.log(`Hexa deploy agent (http) on :${PORT}`));
}
