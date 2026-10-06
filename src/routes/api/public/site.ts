import { createFileRoute } from "@tanstack/react-router";

// Entry point for the admin's VPS (nginx). The VPS forwards the visitor's domain in X-Hexa-Host.
// Only published sites on connected custom domains (or subdomains of the hosting domain) are served.
async function handle(request: Request) {
  const url = new URL(request.url);
  const host = (request.headers.get("x-hexa-host") ?? url.searchParams.get("host") ?? "").trim().slice(0, 253);
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return new Response("missing host", { status: 400 });
  const { renderPublishedSite } = await import("@/lib/site-render.server");
  return renderPublishedSite({ host }, url.origin);
}

export const Route = createFileRoute("/api/public/site")({
  server: { handlers: { GET: ({ request }) => handle(request), HEAD: ({ request }) => handle(request) } },
});
