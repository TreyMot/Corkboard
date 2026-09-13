-- Tuning match_label against the seeded LWIN data (185k wines):
-- 1. Labels carry accents, LWIN is ASCII (41 accented rows of 185,366), so fold accents
--    on the label side and on the circle's own wines. LWIN columns stay as indexed.
-- 2. An exact name must outrank a name that merely contains it ("Cabernet Sauvignon" vs
--    "Reserve Cabernet Sauvignon"): score each field as the mean of whole-string
--    similarity and the best word_similarity in either direction.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.label_field_score(a text, b text)
RETURNS real
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT ((similarity(a, b) + GREATEST(word_similarity(a, b), word_similarity(b, a))) / 2)::real
$$;

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
    SELECT lower(unaccent(trim(coalesce(p_producer, '')))) AS pp,
           lower(unaccent(trim(coalesce(p_wine, '')))) AS pw
  ),
  cellar AS (
    SELECT 'cellar'::text AS source, w.id AS wine_id, w.lwin7, w.producer, w.cuvee, w.region, w.country,
           w.colour::text AS colour,
           (0.65 * label_field_score(lower(unaccent(w.producer)), q.pp)
            + 0.35 * CASE
                WHEN q.pw = '' AND coalesce(w.cuvee, '') = '' THEN 1
                WHEN q.pw = '' OR coalesce(w.cuvee, '') = '' THEN 0
                ELSE label_field_score(lower(unaccent(w.cuvee)), q.pw)
              END)::real AS score
    FROM public.wine w, q
    WHERE q.pp <> ''
      AND (lower(unaccent(w.producer)) % q.pp OR q.pp <% lower(unaccent(w.producer)) OR lower(unaccent(w.producer)) <% q.pp)
  ),
  lwin AS (
    SELECT 'lwin'::text AS source, NULL::uuid AS wine_id, l.lwin7, coalesce(l.producer, l.display_name) AS producer,
           l.wine AS cuvee, coalesce(l.sub_region, l.region) AS region, l.country, l.colour,
           (0.65 * label_field_score(lower(coalesce(l.producer, l.display_name)), q.pp)
            + 0.35 * CASE
                WHEN q.pw = '' AND coalesce(l.wine, '') = '' THEN 1
                WHEN q.pw = '' OR coalesce(l.wine, '') = '' THEN 0
                ELSE label_field_score(lower(l.wine), q.pw)
              END)::real AS score
    FROM public.lwin_wine l, q
    WHERE q.pp <> ''
      AND (lower(l.producer) % q.pp OR q.pp <% lower(l.producer) OR q.pp <% lower(l.display_name))
      AND NOT EXISTS (SELECT 1 FROM public.wine w WHERE w.lwin7 = l.lwin7)
  )
  SELECT * FROM (SELECT * FROM cellar UNION ALL SELECT * FROM lwin) c
  ORDER BY score DESC, source = 'lwin'
  LIMIT GREATEST(LEAST(max_rows, 20), 1)
$$;
GRANT EXECUTE ON FUNCTION public.match_label(text, text, integer) TO authenticated;
