create type public.app_role as enum ('admin','user');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_bn text not null,
  price_bdt int not null default 0,
  tokens_per_day int not null default 50000,
  max_projects int not null default 3,
  features text[] not null default '{}',
  show_badge boolean not null default true,
  allow_custom_domain boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "plans read" on public.plans for select using (true);
create policy "plans admin write" on public.plans for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, name text,
  plan_id uuid references public.plans(id) on delete set null,
  tokens_used_today int not null default 0,
  last_reset_date date not null default (now() at time zone 'Asia/Dhaka')::date,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile admin update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "profile admin delete" on public.profiles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'নতুন প্রজেক্ট',
  code_html text not null default '',
  messages jsonb not null default '[]',
  subdomain text unique,
  is_published boolean not null default false,
  is_flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "published read" on public.projects for select using (is_published = true);
create policy "own read" on public.projects for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own insert" on public.projects for insert to authenticated with check (user_id = auth.uid());
create policy "own update" on public.projects for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own delete" on public.projects for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tokens_used int not null default 0,
  provider_name text,
  created_at timestamptz not null default now()
);
create index on public.usage_logs (user_id, created_at);
grant select on public.usage_logs to authenticated;
grant all on public.usage_logs to service_role;
alter table public.usage_logs enable row level security;
create policy "usage read" on public.usage_logs for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null, base_url text not null, api_key text not null,
  model text not null,
  custom_headers jsonb not null default '{}',
  max_tokens int not null default 8000,
  temperature real not null default 0.7,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant all on public.ai_providers to service_role;
alter table public.ai_providers enable row level security;

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Hexa AI',
  tagline text not null default 'বাংলায় বলুন, ওয়েবসাইট বানিয়ে নিন',
  logo_url text,
  announcement_text text not null default '',
  announcement_color text not null default '#4f46e5',
  announcement_active boolean not null default false,
  maintenance_mode boolean not null default false,
  support_email text not null default '',
  telegram_link text not null default '',
  rate_limit_per_minute int not null default 10,
  max_output_tokens int not null default 8000,
  free_block_publish boolean not null default false,
  require_email_verify boolean not null default false,
  system_prompt text not null default 'You are an expert web developer. Generate a COMPLETE single-file HTML website with inline CSS and JavaScript. Requirements: mobile-responsive (mobile-first), modern dark or light design as appropriate, NO lorem ipsum — use realistic Bangla/English placeholder content, NO external dependencies except Google Fonts and Tailwind CDN. Output ONLY the HTML code, no explanations.',
  payment_instructions text not null default 'বিকাশ/নগদ নম্বর: 01XXXXXXXXX (পার্সোনাল)। Send Money করে ট্রানজেকশন আইডি নিচে দিন।',
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings read" on public.site_settings for select using (true);
create policy "settings admin" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.site_settings (id) values (1);

create table public.flag_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.flag_keywords to authenticated;
grant all on public.flag_keywords to service_role;
alter table public.flag_keywords enable row level security;
create policy "kw admin" on public.flag_keywords for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.flag_keywords (keyword) values ('casino'),('জুয়া'),('betting'),('phishing');

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  method text not null, trx_id text not null, sender_number text,
  amount int not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.payment_requests to authenticated;
grant all on public.payment_requests to service_role;
alter table public.payment_requests enable row level security;
create policy "pay read" on public.payment_requests for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "pay insert" on public.payment_requests for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy "pay admin update" on public.payment_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.plans (name_en,name_bn,price_bdt,tokens_per_day,max_projects,features,show_badge,allow_custom_domain,is_default) values
('Free','ফ্রি',0,50000,3,array['দৈনিক ৫০,০০০ টোকেন','৩টি প্রজেক্ট','Hexa ব্যাজসহ প্রকাশ','HTML ডাউনলোড'],true,false,true),
('Pro','প্রো',499,500000,-1,array['দৈনিক ৫,০০,০০০ টোকেন','আনলিমিটেড প্রজেক্ট','ব্যাজ ছাড়া প্রকাশ','কাস্টম ডোমেইন','অগ্রাধিকার সাপোর্ট'],false,true,false);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, plan_id)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    (select id from public.plans where is_default order by created_at limit 1));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();