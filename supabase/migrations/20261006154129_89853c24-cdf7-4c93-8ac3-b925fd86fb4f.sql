alter table public.plans
  add column can_publish boolean not null default true,
  add column can_download boolean not null default true,
  add column can_view_code boolean not null default true,
  add column rate_limit_per_minute integer not null default 10,
  add column duration_days integer not null default 30,
  add column default_provider_id uuid references public.ai_providers(id) on delete set null;
update public.plans set duration_days = 0 where price_bdt = 0;

alter table public.profiles add column plan_expires_at timestamptz;

create table public.plan_providers (
  plan_id uuid not null references public.plans(id) on delete cascade,
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  primary key (plan_id, provider_id)
);
grant select, insert, update, delete on public.plan_providers to authenticated;
grant all on public.plan_providers to service_role;
alter table public.plan_providers enable row level security;
create policy "pp admin" on public.plan_providers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.aura_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.plans(id) on delete cascade,
  invoice_id text unique,
  amount integer not null default 0,
  status text not null default 'pending',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.aura_payments to authenticated;
grant all on public.aura_payments to service_role;
alter table public.aura_payments enable row level security;
create policy "ap read" on public.aura_payments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create trigger aura_touch before update on public.aura_payments for each row execute function public.touch_updated_at();

alter table public.site_settings add column aurapay_enabled boolean not null default true;

drop policy if exists "pay insert" on public.payment_requests;