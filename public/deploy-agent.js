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

const BUILD_ROOT = "/var/hexa/projects";
const BUILD_UID = process.env.HEXA_BUILD_UID ? Number(process.env.HEXA_BUILD_UID) : undefined;
const BUILD_GID = process.env.HEXA_BUILD_GID ? Number(process.env.HEXA_BUILD_GID) : undefined;

function runBuild(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const env = { PATH: process.env.PATH, HOME: BUILD_UID !== undefined ? "/home/hexabuild" : process.env.HOME, NODE_ENV: "development", CI: "1" };
    execFile(cmd, args, { cwd, env, uid: BUILD_UID, gid: BUILD_GID, timeout: 240000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = (String(stdout) + "\n" + String(stderr)).slice(-4000);
      err ? reject(new Error(out || err.message)) : resolve(out);
    });
  });
}

function chownR(p) {
  if (BUILD_UID === undefined) return;
  fs.chownSync(p, BUILD_UID, BUILD_GID);
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) chownR(path.join(p, f));
}

// Builds a React+Vite project and returns dist/ as ONE html file (JS/CSS inlined).
async function build({ projectId, files }, step) {
  if (!/^[0-9a-f-]{36}$/.test(projectId)) throw new Error("invalid project");
  if (!Array.isArray(files) || !files.length || files.length > 200) throw new Error("invalid files");
  const dir = path.join(BUILD_ROOT, projectId);
  for (const e of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (e !== "node_modules") fs.rmSync(path.join(dir, e), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  step({ step: "writing" });
  for (const f of files) {
    const rel = path.normalize(String(f.path || "")).replace(/^(\.\.(\/|\\|$))+/, "");
    if (!rel || path.isAbsolute(rel) || rel.startsWith("..") || rel.includes("node_modules")) continue;
    const full = path.join(dir, rel);
    if (!full.startsWith(dir + path.sep)) continue;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, String(f.content ?? ""));
  }
  chownR(dir);
  step({ step: "installing" });
  try { await runBuild("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error"], dir); }
  catch (e) { return { step: "failed", phase: "install", log: String(e.message) }; }
  step({ step: "building" });
  try { await runBuild("npx", ["--no-install", "vite", "build", "--base", "./"], dir); }
  catch (e) { return { step: "failed", phase: "build", log: String(e.message) }; }
  const dist = path.join(dir, "dist");
  let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const read = (ref) => { const p = path.join(dist, ref.replace(/^\.?\//, "")); return p.startsWith(dist) && fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; };
  html = html.replace(/<script([^>]*?)\ssrc="([^"]+)"([^>]*)><\/script>/g, (m, a, src, b) => { const c = read(src); return c == null ? m : `<script${a}${b}>${c.replace(/<\/script/gi, "<\\/script")}</script>`; });
  html = html.replace(/<link([^>]*?)rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g, (m, a, b, href) => { const c = read(href); return c == null ? m : `<style>${c}</style>`; });
  html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, "");
  return { step: "ready", html };
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
  req.on("data", (c) => { body += c; if (body.length > 12_000_000) req.destroy(); });
  req.on("end", async () => {
    if (!verify(req, body)) { res.statusCode = 401; res.end(JSON.stringify({ error: "unauthorized" })); return; }
    res.writeHead(200, { "Content-Type": "application/x-ndjson" });
    const step = (o) => res.write(JSON.stringify(o) + "\n");
    try {
      const data = JSON.parse(body);
      const out = req.url === "/deploy" ? await deploy(data, step) : req.url === "/remove" ? await remove(data, step) : req.url === "/build" ? await build(data, step) : (() => { throw new Error("unknown action"); })();
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
