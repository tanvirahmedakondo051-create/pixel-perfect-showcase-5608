import { createFileRoute } from "@tanstack/react-router";

// Published sites are served as plain cached HTML (no app shell) for speed.
export const Route = createFileRoute("/s/$subdomain")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { renderPublishedSite } = await import("@/lib/site-render.server");
        const sub = String(params.subdomain).slice(0, 80);
        return renderPublishedSite({ subdomain: sub }, new URL(request.url).origin);
      },
    },
  },
});
