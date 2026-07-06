
-- Profiles: display name + built-in avatar id (1..100). Anonymous, keyed by client uid (text).
CREATE TABLE public.profiles (
  uid text PRIMARY KEY,
  display_name text NOT NULL,
  avatar_id integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are readable by everyone" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can insert a profile" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can update a profile" ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Community messages: add optional image path + delete policy for own messages.
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS image_path text;
-- Content can now be optional if there is an image.
ALTER TABLE public.community_messages ALTER COLUMN content DROP NOT NULL;
CREATE POLICY "anyone can delete community messages" ON public.community_messages
  FOR DELETE TO anon, authenticated USING (true);

-- DM threads (1-to-1). user_a < user_b so pair uniqueness is enforced.
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a text NOT NULL,
  user_b text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.dm_threads TO anon, authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm threads readable by anyone" ON public.dm_threads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dm threads insertable by anyone" ON public.dm_threads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "dm threads updatable by anyone" ON public.dm_threads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX dm_threads_user_a_idx ON public.dm_threads(user_a, last_message_at DESC);
CREATE INDEX dm_threads_user_b_idx ON public.dm_threads(user_b, last_message_at DESC);

-- DM messages
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  content text,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_messages TO anon, authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm messages readable by anyone" ON public.dm_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dm messages insertable by anyone" ON public.dm_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "dm messages deletable by anyone" ON public.dm_messages FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX dm_messages_thread_idx ON public.dm_messages(thread_id, created_at);

-- Bump thread last_message_at + preview when a message is inserted.
CREATE OR REPLACE FUNCTION public.tg_dm_bump_thread() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.dm_threads
     SET last_message_at = NEW.created_at,
         last_preview = COALESCE(NULLIF(NEW.content, ''), '[image]')
   WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER dm_messages_bump_thread AFTER INSERT ON public.dm_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_dm_bump_thread();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;

-- Storage policies for chat-images (private bucket, signed URLs on read)
CREATE POLICY "chat-images anon read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-images');
CREATE POLICY "chat-images anon insert" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "chat-images anon delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'chat-images');
