-- Detach community tables from auth.users so guests can participate
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_author_id_fkey;

-- Grants for anonymous guests
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO anon;

-- Replace auth-scoped policies with open guest policies
DROP POLICY IF EXISTS "Signed-in users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "guest profiles readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "guest profiles insertable" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "guest profiles updatable" ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Signed-in users can read posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "guest posts readable" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "guest posts insertable" ON public.posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "guest posts updatable" ON public.posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "guest posts deletable" ON public.posts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Signed-in users can read likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like as self" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike own likes" ON public.post_likes;
CREATE POLICY "guest likes readable" ON public.post_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "guest likes insertable" ON public.post_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "guest likes deletable" ON public.post_likes FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Signed-in users can read comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can comment as self" ON public.post_comments;
DROP POLICY IF EXISTS "Users can edit own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "guest comments readable" ON public.post_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "guest comments insertable" ON public.post_comments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "guest comments updatable" ON public.post_comments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "guest comments deletable" ON public.post_comments FOR DELETE TO anon, authenticated USING (true);