-- Label photo identification: an LWIN reference table, fuzzy matching over the
-- circle's own wines and LWIN, and a trusted path for creating verified wines.
--
-- LWIN (Liv-ex Wine Identification Number) is published by Liv-ex under CC BY 4.0:
-- https://www.liv-ex.com/lwin/lwin-creative-commons/ . Attribution is shown in the app.

-- 1. Reference table, seeded by scripts/seed-lwin.mjs (rerunnable, upserts on lwin7).
CREATE TABLE public.lwin_wine (
  lwin7 text PRIMARY KEY CHECK (lwin7 ~ '^[0-9]{7}$'),
  display_name text NOT NULL,
  producer text,
  wine text,
  country text,
  region text,
  sub_region text,
  colour text,
  type text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lwin_wine_producer_trgm_idx ON public.lwin_wine USING gin (lower(producer) extensions.gin_trgm_ops);
CREATE INDEX lwin_wine_display_trgm_idx ON public.lwin_wine USING gin (lower(display_name) extensions.gin_trgm_ops);
GRANT SELECT ON public.lwin_wine TO authenticated;
GRANT ALL ON public.lwin_wine TO service_role;
ALTER TABLE public.lwin_wine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read lwin" ON public.lwin_wine FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS wine_cuvee_trgm_idx ON public.wine USING gin (lower(cuvee) extensions.gin_trgm_ops);
-- One local wine per LWIN code, so a second member photographing the same bottle reuses it.
CREATE UNIQUE INDEX wine_lwin7_unique_idx ON public.wine (lwin7) WHERE lwin7 IS NOT NULL;

-- 2. Members may not set verified or lwin7 themselves. Only adopt_lwin_wine() does.
-- (Previously the "members correct wines" UPDATE policy let anyone flip verified.)
REVOKE INSERT, UPDATE ON public.wine FROM authenticated;
GRANT INSERT (producer, cuvee, region, colour, varietal, varietal_raw, vineyard, location, country, glass)
  ON public.wine TO authenticated;
GRANT UPDATE (producer, cuvee, region, colour, varietal, varietal_raw, vineyard, location, country, glass)
  ON public.wine TO authenticated;

-- 3. Candidates for a label read: the circle's wines first, then LWIN.
-- Score = 0.65 producer + 0.35 wine name, each the best of similarity and word_similarity
-- in both directions, so "Dujac" on a label still meets "Domaine Dujac" in LWIN.
-- ponytail: fixed weights and trigram scoring only; move to pgvector embeddings if a
-- benchmark on the circle's real labels shows too many misses.
CREATE OR REPLACE FUNCTION public.match_label(p_producer text, p_wine text, max_rows integer DEFAULT 5)
RETURNS TABLE (
  source text, wine_id uuid, lwin7 text, producer text, cuvee text,
  region text, country text, colour text, score real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT lower(trim(coalesce(p_producer, ''))) AS pp, lower(trim(coalesce(p_wine, ''))) AS pw
  ),
  cellar AS (
    SELECT 'cellar'::text AS source, w.id AS wine_id, w.lwin7, w.producer, w.cuvee, w.region, w.country,
           w.colour::text AS colour,
           (0.65 * GREATEST(similarity(lower(w.producer), q.pp), word_similarity(q.pp, lower(w.producer)), word_similarity(lower(w.producer), q.pp))
            + 0.35 * CASE
                WHEN q.pw = '' AND coalesce(w.cuvee, '') = '' THEN 1
                WHEN q.pw = '' OR coalesce(w.cuvee, '') = '' THEN 0
                ELSE GREATEST(similarity(lower(w.cuvee), q.pw), word_similarity(q.pw, lower(w.cuvee)), word_similarity(lower(w.cuvee), q.pw))
              END)::real AS score
    FROM public.wine w, q
    WHERE q.pp <> ''
      AND (lower(w.producer) % q.pp OR q.pp <% lower(w.producer) OR lower(w.producer) <% q.pp)
  ),
  lwin AS (
    SELECT 'lwin'::text AS source, NULL::uuid AS wine_id, l.lwin7, coalesce(l.producer, l.display_name) AS producer,
           l.wine AS cuvee, coalesce(l.sub_region, l.region) AS region, l.country, l.colour,
           (0.65 * GREATEST(similarity(lower(coalesce(l.producer, l.display_name)), q.pp), word_similarity(q.pp, lower(coalesce(l.producer, l.display_name))), word_similarity(lower(coalesce(l.producer, '')), q.pp))
            + 0.35 * CASE
                WHEN q.pw = '' AND coalesce(l.wine, '') = '' THEN 1
                WHEN q.pw = '' THEN 0
                ELSE GREATEST(similarity(lower(coalesce(l.wine, '')), q.pw), word_similarity(q.pw, lower(l.display_name)))
              END)::real AS score
    FROM public.lwin_wine l, q
    WHERE q.pp <> ''
      AND (lower(l.producer) % q.pp OR q.pp <% lower(l.producer) OR q.pp <% lower(l.display_name))
      -- Already adopted into the cellar: the cellar row above stands in for it.
      AND NOT EXISTS (SELECT 1 FROM public.wine w WHERE w.lwin7 = l.lwin7)
  )
  SELECT * FROM (SELECT * FROM cellar UNION ALL SELECT * FROM lwin) c
  ORDER BY score DESC, source = 'lwin'
  LIMIT GREATEST(LEAST(max_rows, 20), 1)
$$;
GRANT EXECUTE ON FUNCTION public.match_label(text, text, integer) TO authenticated;

-- 4. The only way a verified wine is created: identity copied from lwin_wine, never
-- from the client. Style and the member-editable details come from the caller.
CREATE OR REPLACE FUNCTION public.adopt_lwin_wine(
  p_lwin7 text,
  p_colour public.wine_colour,
  p_varietal text DEFAULT NULL,
  p_glass text DEFAULT NULL,
  p_vineyard text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
  ref public.lwin_wine%ROWTYPE;
  new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'members only' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO existing FROM public.wine WHERE lwin7 = p_lwin7;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  SELECT * INTO ref FROM public.lwin_wine WHERE lwin7 = p_lwin7;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown LWIN code' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.wine (lwin7, producer, cuvee, region, country, colour, varietal, glass, vineyard, location, verified)
  VALUES (
    ref.lwin7,
    coalesce(ref.producer, ref.display_name),
    nullif(ref.wine, ''),
    coalesce(ref.sub_region, ref.region),
    ref.country,
    p_colour,
    nullif(trim(p_varietal), ''),
    CASE WHEN p_glass IN ('straw','gold','onion','violet','garnet','tawny') THEN p_glass END,
    nullif(trim(p_vineyard), ''),
    nullif(trim(p_location), ''),
    true
  )
  ON CONFLICT (lwin7) WHERE lwin7 IS NOT NULL DO NOTHING
  RETURNING id INTO new_id;

  -- Lost a race with another member adopting the same code: use theirs.
  IF new_id IS NULL THEN
    SELECT id INTO new_id FROM public.wine WHERE lwin7 = p_lwin7;
  END IF;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.adopt_lwin_wine(text, public.wine_colour, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adopt_lwin_wine(text, public.wine_colour, text, text, text, text) TO authenticated;
