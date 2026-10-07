CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
INSERT INTO public.app_secrets (name, value) VALUES ('cron_token', encode(extensions.gen_random_bytes(32), 'hex')) ON CONFLICT (name) DO NOTHING;
SELECT cron.schedule('hexa-expiry-hourly', '17 * * * *', $$
  SELECT net.http_post(
    url := 'https://project--3572b892-5b47-4784-b42e-b77f6b2f6e0d.lovable.app/api/public/cron/expiry',
    headers := jsonb_build_object('Content-Type','application/json','X-Hexa-Cron', (SELECT value FROM public.app_secrets WHERE name = 'cron_token')),
    body := '{}'::jsonb
  );
$$);