ALTER TABLE public.site_settings
  ADD COLUMN grace_days int NOT NULL DEFAULT 7,
  ADD COLUMN delete_after_days int NOT NULL DEFAULT 30,
  ADD COLUMN support_whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN agent_port int NOT NULL DEFAULT 8443,
  ADD COLUMN agent_host text NOT NULL DEFAULT '';
ALTER TABLE public.projects
  ADD COLUMN deploy_status text NOT NULL DEFAULT 'none',
  ADD COLUMN deploy_message text NOT NULL DEFAULT '',
  ADD COLUMN deployed_url text,
  ADD COLUMN deployed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN sites_deleted_at timestamptz;

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
       or new.changes_since_publish is distinct from old.changes_since_publish
       or new.deploy_status is distinct from old.deploy_status
       or new.deploy_message is distinct from old.deploy_message
       or new.deployed_url is distinct from old.deployed_url
       or new.deployed_at is distinct from old.deployed_at then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end $function$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;