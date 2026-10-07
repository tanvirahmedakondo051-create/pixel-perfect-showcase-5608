-- lovable-cron-fallback-reviewed: rescue job is armed only while builds are active and unschedules itself when none remain
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  mode text NOT NULL DEFAULT 'build',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX generation_jobs_project_idx ON public.generation_jobs(project_id, created_at DESC);
GRANT SELECT ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own jobs" ON public.generation_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.app_secrets (name, value) VALUES ('job_token', encode(extensions.gen_random_bytes(32), 'hex')) ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.kick_job(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
declare j record; sec text;
begin
  select * into j from public.generation_jobs where id = _id;
  if not found then return; end if;
  select value into sec from public.app_secrets where name = 'job_token';
  update public.generation_jobs set attempts = attempts + 1, heartbeat_at = now(), status = 'running', updated_at = now() where id = _id;
  if not exists (select 1 from cron.job where jobname = 'hexa-job-rescue') then
    perform cron.schedule('hexa-job-rescue', '* * * * *', 'select public.rescue_jobs()');
  end if;
  perform net.http_post(
    url := j.origin || '/api/public/generate',
    headers := jsonb_build_object('Content-Type','application/json','X-Hexa-Job', _id::text, 'X-Hexa-Sig', encode(extensions.hmac(_id::text, sec, 'sha256'), 'hex')),
    body := '{}'::jsonb,
    timeout_milliseconds := 900000
  );
end $$;

CREATE OR REPLACE FUNCTION public.job_push(_id uuid, _events jsonb, _status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare s text;
begin
  update public.generation_jobs
    set events = events || coalesce(_events, '[]'::jsonb),
        status = case when status = 'cancelled' then status else coalesce(_status, status) end,
        heartbeat_at = now(), updated_at = now()
    where id = _id returning status into s;
  return s;
end $$;

CREATE OR REPLACE FUNCTION public.rescue_jobs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare j record; cp record; n integer := 0;
begin
  for j in select * from public.generation_jobs where status in ('running','queued') and heartbeat_at < now() - interval '2 minutes' limit 20 loop
    if j.attempts >= 3 then
      update public.generation_jobs set status = 'error', error = 'সার্ভার কাজটি শেষ করতে পারেনি। আবার চেষ্টা করুন।',
        events = events || jsonb_build_array(jsonb_build_object('t','error','msg','সার্ভার কাজটি শেষ করতে পারেনি। আবার চেষ্টা করুন।')), updated_at = now()
        where id = j.id;
    else
      select * into cp from public.task_checkpoints where project_id = j.project_id and status = 'running' and created_at >= j.created_at order by created_at desc limit 1;
      if found then
        update public.task_checkpoints set status = 'paused' where id = cp.id;
        update public.generation_jobs set input = input || jsonb_build_object('resumeId', cp.id::text, 'mode', 'build') where id = j.id;
      end if;
      perform public.kick_job(j.id);
      n := n + 1;
    end if;
  end loop;
  delete from public.generation_jobs where created_at < now() - interval '7 days';
  if not exists (select 1 from public.generation_jobs where status in ('running','queued')) then
    perform cron.unschedule('hexa-job-rescue');
  end if;
  return n;
end $$;

REVOKE ALL ON FUNCTION public.kick_job(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.job_push(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rescue_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kick_job(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.job_push(uuid, jsonb, text) TO service_role;