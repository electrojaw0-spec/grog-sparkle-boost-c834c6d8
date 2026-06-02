CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('week','month')),
  used boolean NOT NULL DEFAULT false,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.access_codes TO anon, authenticated;
GRANT ALL ON public.access_codes TO service_role;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read codes" ON public.access_codes FOR SELECT USING (true);
CREATE POLICY "anyone can redeem codes" ON public.access_codes FOR UPDATE USING (true) WITH CHECK (true);