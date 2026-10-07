ALTER TABLE public.site_users ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'email';
ALTER TABLE public.site_users ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';
ALTER TABLE public.site_users ALTER COLUMN password_hash SET DEFAULT '';