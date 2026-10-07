alter table public.projects add column if not exists project_type text not null default 'html' check (project_type in ('html','react')),
  add column if not exists files jsonb not null default '[]'::jsonb,
  add column if not exists build_status text not null default 'none',
  add column if not exists build_log text not null default '',
  add column if not exists backend_enabled boolean not null default false;

alter table public.site_settings add column if not exists backend_max_tables integer not null default 10,
  add column if not exists backend_max_rows integer not null default 10000,
  add column if not exists backend_master_url text not null default '';

create table public.backend_tables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  table_name text not null,
  schema_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, table_name)
);
grant select, delete on public.backend_tables to authenticated;
grant all on public.backend_tables to service_role;
alter table public.backend_tables enable row level security;
create policy "owner reads tables" on public.backend_tables for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "owner deletes tables" on public.backend_tables for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create table public.backend_rows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  table_name text not null,
  data jsonb not null default '{}'::jsonb,
  owner_id uuid,
  created_at timestamptz not null default now()
);
create index backend_rows_pt on public.backend_rows(project_id, table_name, created_at desc);
grant select, delete on public.backend_rows to authenticated;
grant all on public.backend_rows to service_role;
alter table public.backend_rows enable row level security;
create policy "owner reads rows" on public.backend_rows for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "owner deletes rows" on public.backend_rows for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create table public.site_users (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  name text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);
grant select, delete on public.site_users to authenticated;
grant all on public.site_users to service_role;
alter table public.site_users enable row level security;
create policy "owner reads site users" on public.site_users for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "owner deletes site users" on public.site_users for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

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
       or new.domain_found_ns is distinct from old.domain_found_ns
       or new.published_html is distinct from old.published_html
       or new.published_code_hash is distinct from old.published_code_hash
       or new.published_version is distinct from old.published_version
       or new.changes_since_publish is distinct from old.changes_since_publish
       or new.deploy_status is distinct from old.deploy_status
       or new.deploy_message is distinct from old.deploy_message
       or new.deployed_url is distinct from old.deployed_url
       or new.deployed_at is distinct from old.deployed_at
       or new.build_status is distinct from old.build_status
       or new.build_log is distinct from old.build_log
       or new.backend_enabled is distinct from old.backend_enabled then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end $function$;