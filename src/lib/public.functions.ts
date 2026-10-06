import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const getPublishedSite = createServerFn({ method: "GET" })
  .inputValidator((d: { subdomain: string }) => z.object({ subdomain: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: p } = await sb
      .from("projects")
      .select("name, code_html, show_badge")
      .eq("subdomain", data.subdomain)
      .eq("is_published", true)
      .maybeSingle();
    return p;
  });
