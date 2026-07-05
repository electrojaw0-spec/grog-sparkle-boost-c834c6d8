
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 40),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX community_messages_created_at_idx ON public.community_messages (created_at DESC);

GRANT SELECT, INSERT ON public.community_messages TO anon, authenticated;
GRANT ALL ON public.community_messages TO service_role;

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community messages"
  ON public.community_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can post community messages"
  ON public.community_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
