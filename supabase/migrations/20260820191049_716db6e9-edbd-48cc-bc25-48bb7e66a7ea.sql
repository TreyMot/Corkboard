DROP VIEW IF EXISTS public.rating_shared;

-- All members read every rating; the 100-point score lives apart and stays private.
DROP POLICY IF EXISTS "own ratings read" ON public.rating;
CREATE POLICY "members read ratings" ON public.rating FOR SELECT TO authenticated USING (true);

ALTER TABLE public.rating DROP COLUMN score_100;

CREATE TABLE public.rating_private (
  rating_id uuid PRIMARY KEY REFERENCES public.rating(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  score_100 integer CHECK (score_100 IS NULL OR (score_100 >= 50 AND score_100 <= 100))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rating_private TO authenticated;
GRANT ALL ON public.rating_private TO service_role;
ALTER TABLE public.rating_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own private score" ON public.rating_private FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- allowed_email is server-only by design; make that explicit with a deny-all policy.
CREATE POLICY "no client access to allowed emails" ON public.allowed_email FOR SELECT TO authenticated USING (false);