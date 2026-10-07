import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SkillPack = { id: string; slug: string; name_bn: string; icon: string; system_prompt: string; is_active: boolean; sort_order: number };

export function useSkillPacks(all = false) {
  return useQuery({
    queryKey: ["skill-packs", all],
    queryFn: async () => {
      let q = supabase.from("skill_packs").select("*").order("sort_order");
      if (!all) q = q.eq("is_active", true).neq("slug", "design-quality");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SkillPack[];
    },
  });
}
