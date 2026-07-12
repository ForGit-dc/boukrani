-- Added at scaffold time (2026-07-12): the template migration set references
-- public.conversation_summaries (policies, grants) but never creates it; on the
-- reference project it had been created outside the migrations. Schema matches
-- src/integrations/supabase/types.ts (session_id, summary, updated_at).
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  session_id TEXT NOT NULL PRIMARY KEY,
  summary TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
