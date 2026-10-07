ALTER TABLE public.projects
  ADD COLUMN published_html text,
  ADD COLUMN published_code_hash text,
  ADD COLUMN published_version int NOT NULL DEFAULT 0,
  ADD COLUMN changes_since_publish int NOT NULL DEFAULT 0,
  ADD COLUMN github_repo text;
UPDATE public.projects SET published_html = code_html WHERE is_published;

ALTER TABLE public.site_settings
  ADD COLUMN plan_prompt text NOT NULL DEFAULT 'You are a friendly Bangla-speaking website planning assistant. Discuss, ask ONE clarifying question at a time (max 3) with 3-4 quick-tap options, then output detailed build plan in Bangla as numbered checklist. End with: ''প্ল্যান ঠিক আছে? ✅ অনুমোদন করলে বিল্ড মোডে যান।'' NEVER write code in Plan Mode.',
  ADD COLUMN build_prompt text NOT NULL DEFAULT 'You are an elite frontend developer. Generate COMPLETE single-file HTML. 5 RULES: 1) Visual hierarchy — one headline, subtext, CTA. Max 2 fonts. 2) Self-audit: hero striking in 3s? Premium on phone? 3) Design system: ONE primary + ONE accent + neutrals, max 4 colors. 4) Spacing: 80px/48px sections, 8px grid. 5) Every button works, no dead links. Mobile-first. NO lorem ipsum — realistic Bangla content. Output ONLY raw HTML <!DOCTYPE html> to </html>. No markdown, no JSON, no explanations.';

CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  code_html text NOT NULL,
  changelog_bn text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_number)
);
GRANT SELECT ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions read" ON public.project_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.github_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  github_username text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  access_token_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.github_connections TO service_role;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.guard_project_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    if new.is_published is distinct from old.is_published
       or new.is_flagged is distinct from old.is_flagged
       or new.flag_reason is distinct from old.flag_reason
       or new.subdomain is distinct from old.subdomain
       or new.show_badge is distinct from old.show_badge
       or new.user_id is distinct from old.user_id
       or new.custom_domain is distinct from old.custom_domain
       or new.domain_status is distinct from old.domain_status
       or new.domain_checked_at is distinct from old.domain_checked_at
       or new.domain_found_ns is distinct from old.domain_found_ns
       or new.published_html is distinct from old.published_html
       or new.published_code_hash is distinct from old.published_code_hash
       or new.published_version is distinct from old.published_version
       or new.changes_since_publish is distinct from old.changes_since_publish then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_project_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.is_published := false; new.is_flagged := false; new.subdomain := null;
    new.custom_domain := null; new.domain_status := 'pending'; new.domain_found_ns := '{}';
    new.published_html := null; new.published_code_hash := null; new.published_version := 0; new.changes_since_publish := 0;
  end if;
  return new;
end $function$;