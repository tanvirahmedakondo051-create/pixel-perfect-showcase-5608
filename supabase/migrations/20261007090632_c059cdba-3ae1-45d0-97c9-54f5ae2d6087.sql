alter table public.profiles add column if not exists coins numeric(10,2) not null default 0;
alter table public.plans add column if not exists bonus_coins integer not null default 10,
  add column if not exists daily_coins integer not null default 1,
  add column if not exists coin_cap integer not null default 15;
alter table public.site_settings add column if not exists tokens_per_coin integer not null default 10000;
alter table public.aura_payments add column if not exists coins_granted boolean not null default false;

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric(10,2) not null,
  type text not null check (type in ('bonus','refill','purchase','spend')),
  reason text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.coin_transactions to authenticated;
grant all on public.coin_transactions to service_role;
alter table public.coin_transactions enable row level security;
create policy "own coin tx" on public.coin_transactions for select to authenticated using (auth.uid() = user_id);
create policy "admin coin tx" on public.coin_transactions for select to authenticated using (public.has_role(auth.uid(),'admin'));
create index coin_tx_user on public.coin_transactions(user_id, created_at desc);

create or replace function public.add_coins(_user uuid, _amount numeric, _type text, _reason text)
returns numeric language plpgsql security definer set search_path = public as $$
declare b numeric;
begin
  update public.profiles set coins = greatest(0, coins + _amount) where id = _user returning coins into b;
  insert into public.coin_transactions(user_id, amount, type, reason) values (_user, _amount, _type, coalesce(_reason,''));
  return b;
end $$;
revoke execute on function public.add_coins(uuid,numeric,text,text) from public, anon, authenticated;
grant execute on function public.add_coins(uuid,numeric,text,text) to service_role;

create or replace function public.daily_coin_refill()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with t as (
    select p.id, least(coalesce(pl.coin_cap,15), p.coins + coalesce(pl.daily_coins,1)) - p.coins as add
    from public.profiles p left join public.plans pl on pl.id = p.plan_id
    where p.coins < coalesce(pl.coin_cap,15) and not p.is_banned
  ), u as (
    update public.profiles p set coins = p.coins + t.add from t where p.id = t.id and t.add > 0 returning p.id, t.add
  )
  insert into public.coin_transactions(user_id, amount, type, reason) select id, add, 'refill', 'দৈনিক রিফিল' from u;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.daily_coin_refill() from public, anon, authenticated;
grant execute on function public.daily_coin_refill() to service_role;

create or replace function public.guard_profile_coins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') and new.coins is distinct from old.coins then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create trigger profiles_coin_guard before update on public.profiles for each row execute function public.guard_profile_coins();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; bonus int;
begin
  select id, bonus_coins into pid, bonus from public.plans where is_default order by created_at limit 1;
  insert into public.profiles (id, email, name, plan_id, coins)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), pid, coalesce(bonus,10));
  insert into public.coin_transactions(user_id, amount, type, reason) values (new.id, coalesce(bonus,10), 'bonus', 'সাইনআপ বোনাস');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;