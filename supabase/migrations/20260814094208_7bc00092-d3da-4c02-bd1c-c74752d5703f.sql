ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE public.post_comments ALTER COLUMN content DROP NOT NULL;