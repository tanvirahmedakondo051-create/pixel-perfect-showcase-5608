alter table public.site_settings
  add column if not exists ns1 text not null default '',
  add column if not exists ns2 text not null default '',
  add column if not exists ns3 text not null default '',
  add column if not exists ns4 text not null default '',
  add column if not exists server_ip text not null default '',
  add column if not exists hosting_domain text not null default '';

alter table public.projects
  add column if not exists custom_domain text unique,
  add column if not exists domain_status text not null default 'pending',
  add column if not exists domain_checked_at timestamptz,
  add column if not exists domain_found_ns text[] not null default '{}';

create or replace function public.guard_project_fields()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
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
       or new.domain_found_ns is distinct from old.domain_found_ns then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end $function$;

create or replace function public.guard_project_insert()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.is_published := false; new.is_flagged := false; new.subdomain := null;
    new.custom_domain := null; new.domain_status := 'pending'; new.domain_found_ns := '{}';
  end if;
  return new;
end $function$;