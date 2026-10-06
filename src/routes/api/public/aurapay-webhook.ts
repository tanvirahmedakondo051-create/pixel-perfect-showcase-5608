import { createFileRoute } from "@tanstack/react-router";

// Never trusts the body: the invoice is re-verified with AuraPay before any plan is applied.
export const Route = createFileRoute("/api/public/aurapay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let invoice = "";
        try {
          const j: any = await request.json();
          invoice = String(j?.invoice_id ?? j?.data?.invoice_id ?? "");
        } catch { /* ignore */ }
        if (!invoice || invoice.length > 200) return new Response("bad request", { status: 400 });
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { auraVerifyAndApply } = await import("@/lib/plan.server");
        const r = await auraVerifyAndApply(db, invoice);
        return Response.json({ ok: !!r.ok });
      },
    },
  },
});
