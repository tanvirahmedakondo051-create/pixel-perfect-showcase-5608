ALTER TABLE public.site_settings ALTER COLUMN single_pass_simple SET DEFAULT false;
ALTER TABLE public.site_settings ALTER COLUMN max_output_tokens SET DEFAULT 16000;
UPDATE public.site_settings SET single_pass_simple = false, max_output_tokens = GREATEST(max_output_tokens, 16000) WHERE id = 1;