ALTER TABLE public.usage_logs ADD COLUMN tokens_saved integer NOT NULL DEFAULT 0;
CREATE TABLE public.chat_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  up_to_message_id int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.chat_summaries(project_id, up_to_message_id DESC);
GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT ALL ON public.chat_summaries TO service_role;
ALTER TABLE public.chat_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own summaries read" ON public.chat_summaries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));