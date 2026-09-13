-- match_label ran as the caller, so every LWIN candidate re-evaluated the wine table's
-- membership policy in its NOT EXISTS check: 5-8s and timeouts on 185k LWIN rows.
-- It now runs as definer (like adopt_lwin_wine) and checks membership once. It returns only
-- wine names that members can already read.
CREATE OR REPLACE FUNCTION public.match_label(
  p_producer text,
  p_names text[] DEFAULT '{}',
  p_colour text DEFAULT NULL,
  p_has_cuvee boolean DEFAULT false,
  max_rows integer DEFAULT 5
)
RETURNS TABLE (
  source text, wine_id uuid, lwin7 text, producer text, cuvee text,
  region text, country text, colour text, score real, name_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER -- runs without per-row RLS; membership is checked once below
SET search_path = public, extensions, pg_temp
AS $$
  WITH q AS (
    SELECT lower(unaccent(trim(coalesce(p_producer, '')))) AS pp,
           label_core(lower(unaccent(trim(coalesce(p_producer, ''))))) AS pc,
           coalesce(
             (SELECT array_agg(DISTINCT lower(unaccent(trim(n)))) FROM unnest(p_names) n WHERE trim(coalesce(n, '')) <> ''),
             '{}'::text[]
           ) AS names,
           lower(coalesce(p_colour, '')) AS col
    WHERE (SELECT public.is_member()) -- non-members get no rows
  ),
  cellar AS (
    SELECT w.id, w.lwin7, w.producer, w.cuvee, w.region, w.country, w.colour::text AS colour,
           label_field_score(label_core(lower(unaccent(w.producer))), q.pc) AS prod,
           CASE
             WHEN cardinality(q.names) = 0 AND coalesce(w.cuvee, '') = '' THEN 1
             WHEN cardinality(q.names) = 0 OR coalesce(w.cuvee, '') = '' THEN 0
             ELSE (SELECT max(label_field_score(lower(unaccent(w.cuvee)), n)) FROM unnest(q.names) n)
           END AS nm,
           CASE WHEN q.col IN ('red', 'white', 'rose') AND w.colour::text IN ('red', 'white', 'rose')
                     AND w.colour::text <> q.col THEN 0.15 ELSE 0 END AS penalty
    FROM public.wine w, q
    WHERE q.pp <> ''
      AND (lower(unaccent(w.producer)) % q.pp OR q.pc <% lower(unaccent(w.producer))
           OR lower(unaccent(w.producer)) <% q.pp)
  ),
  lwin AS (
    SELECT l.lwin7, coalesce(l.producer, l.display_name) AS producer, l.wine AS cuvee,
           coalesce(l.sub_region, l.region) AS region, l.country, l.colour,
           label_field_score(label_core(lower(coalesce(l.producer, l.display_name))), q.pc) AS prod,
           CASE
             WHEN cardinality(q.names) = 0 AND coalesce(l.wine, '') = '' THEN 1
             WHEN cardinality(q.names) = 0 OR coalesce(l.wine, '') = '' THEN 0
             ELSE (SELECT max(label_field_score(lower(l.wine), n)) FROM unnest(q.names) n)
           END AS nm,
           -- "Famille Perrin | Chateau de Beaucastel Rouge": the label's producer is LWIN's wine.
           CASE WHEN p_has_cuvee THEN 0 ELSE label_field_score(lower(coalesce(l.wine, '')), q.pp) END AS as_wine,
           CASE WHEN q.col IN ('red', 'white', 'rose') AND lower(l.colour) IN ('red', 'white', 'rose')
                     AND lower(l.colour) <> q.col THEN 0.15 ELSE 0 END AS penalty
    FROM public.lwin_wine l, q
    WHERE q.pp <> ''
      AND (lower(l.producer) % q.pp OR q.pp <% lower(l.producer) OR q.pc <% lower(l.producer)
           OR q.pp <% lower(l.display_name) OR q.pc <% lower(l.display_name))
      AND NOT EXISTS (SELECT 1 FROM public.wine w WHERE w.lwin7 = l.lwin7)
  ),
  scored AS (
    SELECT 'cellar'::text AS source, c.id AS wine_id, c.lwin7, c.producer, c.cuvee, c.region, c.country, c.colour,
           (0.65 * c.prod + 0.35 * c.nm - c.penalty)::real AS score, c.nm::real AS name_score
    FROM cellar c
    UNION ALL
    SELECT 'lwin'::text, NULL::uuid, l.lwin7, l.producer, l.cuvee, l.region, l.country, l.colour,
           (GREATEST(0.65 * l.prod + 0.35 * l.nm, 0.9 * l.as_wine) - l.penalty)::real,
           (CASE WHEN 0.9 * l.as_wine > 0.65 * l.prod + 0.35 * l.nm THEN l.as_wine ELSE l.nm END)::real
    FROM lwin l
  )
  SELECT * FROM scored
  ORDER BY score DESC, source = 'lwin'
  LIMIT GREATEST(LEAST(max_rows, 20), 1)
$$;

REVOKE ALL ON FUNCTION public.match_label(text, text[], text, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_label(text, text[], text, boolean, integer) TO authenticated;
