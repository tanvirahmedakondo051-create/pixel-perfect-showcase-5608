CREATE TABLE public.task_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  task_id text NOT NULL,
  progress_percent integer NOT NULL DEFAULT 0,
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  partial_html text NOT NULL DEFAULT '',
  prompt text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX task_checkpoints_project_idx ON public.task_checkpoints(project_id, created_at DESC);
GRANT SELECT ON public.task_checkpoints TO authenticated;
GRANT ALL ON public.task_checkpoints TO service_role;
ALTER TABLE public.task_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read checkpoints" ON public.task_checkpoints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('hexa-checkpoint-cleanup', '30 19 * * *', $$DELETE FROM public.task_checkpoints WHERE expires_at < now()$$);