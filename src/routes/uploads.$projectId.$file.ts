import { createFileRoute } from "@tanstack/react-router";

// Serves files users uploaded for their sites (/uploads/{project_id}/{file}), cached for a long time.
export const Route = createFileRoute("/uploads/$projectId/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const pid = String(params.projectId);
        const file = String(params.file);
        if (!/^[0-9a-f-]{36}$/i.test(pid) || !/^[a-z0-9.-]{1,80}$/i.test(file)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("uploads").download(`${pid}/${file}`);
        if (error || !data) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
        const type = data.type || "application/octet-stream";
        const headers: Record<string, string> = {
          "Content-Type": type,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Access-Control-Allow-Origin": "*",
        };
        if (type === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        return new Response(data, { headers });
      },
    },
  },
});
