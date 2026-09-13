-- Remove the previous app's schema entirely
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.want_to_try CASCADE;
DROP TABLE IF EXISTS public.wines CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TYPE public.wine_colour AS ENUM ('red','white','rose','orange','sparkling','fortified');

-- Emails allowed to join without an invite code (founders)
CREATE TABLE public.allowed_email (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.allowed_email TO service_role;
ALTER TABLE public.allowed_email ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  joined_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile TO authenticated;
GRANT ALL ON public.profile TO service_role;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read all profiles" ON public.profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profile FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.wine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lwin7 text,
  producer text NOT NULL,
  cuvee text NOT NULL,
  region text,
  colour public.wine_colour NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wine_producer_idx ON public.wine (lower(producer));
CREATE INDEX wine_cuvee_idx ON public.wine (lower(cuvee));
GRANT SELECT, INSERT, UPDATE ON public.wine TO authenticated;
GRANT ALL ON public.wine TO service_role;
ALTER TABLE public.wine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read wines" ON public.wine FOR SELECT TO authenticated USING (true);
CREATE POLICY "members add wines" ON public.wine FOR INSERT TO authenticated WITH CHECK (verified = false);
CREATE POLICY "members correct wines" ON public.wine FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.bottling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wine(id) ON DELETE CASCADE,
  vintage integer,
  format_ml integer NOT NULL DEFAULT 750,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bottling_unique_idx ON public.bottling (wine_id, COALESCE(vintage, -1), format_ml);
CREATE INDEX bottling_wine_idx ON public.bottling (wine_id);
GRANT SELECT, INSERT ON public.bottling TO authenticated;
GRANT ALL ON public.bottling TO service_role;
ALTER TABLE public.bottling ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bottlings" ON public.bottling FOR SELECT TO authenticated USING (true);
CREATE POLICY "members add bottlings" ON public.bottling FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.rating (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bottling_id uuid NOT NULL REFERENCES public.bottling(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  stars numeric(2,1) NOT NULL CHECK (stars >= 0.5 AND stars <= 5 AND (stars * 2) = floor(stars * 2)),
  note text,
  score_100 integer CHECK (score_100 IS NULL OR (score_100 >= 50 AND score_100 <= 100)),
  drunk_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bottling_id, user_id)
);
CREATE INDEX rating_created_idx ON public.rating (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rating TO authenticated;
GRANT ALL ON public.rating TO service_role;
ALTER TABLE public.rating ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ratings read" ON public.rating FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ratings insert" ON public.rating FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ratings update" ON public.rating FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ratings delete" ON public.rating FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Every member sees every rating, but score_100 stays private to its author.
CREATE VIEW public.rating_shared
WITH (security_barrier = true) AS
  SELECT id, bottling_id, user_id, stars, note, drunk_on, created_at
  FROM public.rating;
GRANT SELECT ON public.rating_shared TO authenticated;

CREATE TABLE public.wishlist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wine(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wine_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_item TO authenticated;
GRANT ALL ON public.wishlist_item TO service_role;
ALTER TABLE public.wishlist_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist all" ON public.wishlist_item FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.invite (
  code text PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  used_by uuid REFERENCES public.profile(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
GRANT SELECT, INSERT ON public.invite TO authenticated;
GRANT ALL ON public.invite TO service_role;
ALTER TABLE public.invite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invites read" ON public.invite FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "own invites create" ON public.invite FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.wine_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wine(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.wine_edit_log TO authenticated;
GRANT ALL ON public.wine_edit_log TO service_role;
ALTER TABLE public.wine_edit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members write audit rows" ON public.wine_edit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);