create table public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
grant all on public.app_secrets to service_role;
alter table public.app_secrets enable row level security;