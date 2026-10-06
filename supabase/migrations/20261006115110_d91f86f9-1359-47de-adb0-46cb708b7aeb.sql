alter table public.projects add column show_badge boolean not null default true;

create or replace function public.guard_project_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    if new.is_published is distinct from old.is_published
       or new.is_flagged is distinct from old.is_flagged
       or new.flag_reason is distinct from old.flag_reason
       or new.subdomain is distinct from old.subdomain
       or new.show_badge is distinct from old.show_badge
       or new.user_id is distinct from old.user_id then
      raise exception 'not allowed';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_project_fields() from public, anon, authenticated;
create trigger projects_guard before update on public.projects for each row execute function public.guard_project_fields();

create or replace function public.guard_project_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.is_published := false; new.is_flagged := false; new.subdomain := null;
  end if;
  return new;
end $$;
revoke execute on function public.guard_project_insert() from public, anon, authenticated;
create trigger projects_guard_ins before insert on public.projects for each row execute function public.guard_project_insert();