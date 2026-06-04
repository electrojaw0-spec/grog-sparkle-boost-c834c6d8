GRANT INSERT, DELETE ON public.access_codes TO anon, authenticated;
CREATE POLICY "anyone can create codes" ON public.access_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can delete codes" ON public.access_codes FOR DELETE USING (true);