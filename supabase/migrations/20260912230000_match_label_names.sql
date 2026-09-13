-- Second tuning pass, from 28 real bottle photos:
-- 1. Generic words (Vineyards, Cellars, Domaine...) inflated producer similarity:
--    "Singing Water Vineyards" scored 0.70 against "Kew Vineyards". Compare core names.
-- 2. LWIN often names the wine where a label names the producer ("Famille Perrin |
--    Chateau de Beaucastel Rouge"), so the label's producer also scores against LWIN's wine.
-- 3. The name can be the cuvee, cuvee plus grape, the grape, or the appellation
--    ("l'Hospitalet (Gerard Bertrand) | La Clape"), so match_label takes several names.
-- 4. A style that contradicts LWIN's colour (red label, white wine) costs 0.15.
-- ponytail: hand-tuned weights; revisit with more labels or move to embeddings.

CREATE OR REPLACE FUNCTION public.label_core(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    nullif(trim(regexp_replace(
      regexp_replace(t, '\m(chateau|domaine|domaines|weingut|bodega|bodegas|tenuta|cantina|cantine|quinta|maison|famille|family|estate|estates|vineyard|vineyards|winery|wineries|wines|wine|cellars|cellar|the)\M', '', 'g'),
      '\s+', ' ', 'g')), ''),
    t)
$$;

DROP FUNCTION IF EXISTS public.match_label(text, text, integer);

CREATE OR REPLACE FUNCTION public.match_label(
  p_producer text,
  p_names text[] DEFAULT '{}',
  p_colour text DEFAULT NULL,
  max_rows integer DEFAULT 5
)
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
           label_core(lower(unaccent(trim(coalesce(p_producer, ''))))) AS pc,
           coalesce(
             (SELECT array_agg(DISTINCT lower(unaccent(trim(n)))) FROM unnest(p_names) n WHERE trim(coalesce(n, '')) <> ''),
             '{}'::text[]
           ) AS names,
           lower(coalesce(p_colour, '')) AS col
  ),
  cellar AS (
    SELECT 'cellar'::text AS source, w.id AS wine_id, w.lwin7, w.producer, w.cuvee, w.region, w.country,
           w.colour::text AS colour,
           (0.65 * label_field_score(label_core(lower(unaccent(w.producer))), q.pc)
            + 0.35 * CASE
                WHEN cardinality(q.names) = 0 AND coalesce(w.cuvee, '') = '' THEN 1
                WHEN cardinality(q.names) = 0 OR coalesce(w.cuvee, '') = '' THEN 0
                ELSE (SELECT max(label_field_score(lower(unaccent(w.cuvee)), n)) FROM unnest(q.names) n)
              END
            - CASE WHEN q.col IN ('red', 'white', 'rose') AND w.colour::text IN ('red', 'white', 'rose')
                        AND w.colour::text <> q.col THEN 0.15 ELSE 0 END)::real AS score
    FROM public.wine w, q
    WHERE q.pp <> ''
      AND (lower(unaccent(w.producer)) % q.pp OR q.pc <% lower(unaccent(w.producer))
           OR lower(unaccent(w.producer)) <% q.pp)
  ),
  lwin AS (
    SELECT 'lwin'::text AS source, NULL::uuid AS wine_id, l.lwin7, coalesce(l.producer, l.display_name) AS producer,
           l.wine AS cuvee, coalesce(l.sub_region, l.region) AS region, l.country, l.colour,
           (GREATEST(
              0.65 * label_field_score(label_core(lower(coalesce(l.producer, l.display_name))), q.pc)
              + 0.35 * CASE
                  WHEN cardinality(q.names) = 0 AND coalesce(l.wine, '') = '' THEN 1
                  WHEN cardinality(q.names) = 0 OR coalesce(l.wine, '') = '' THEN 0
                  ELSE (SELECT max(label_field_score(lower(l.wine), n)) FROM unnest(q.names) n)
                END,
              0.9 * label_field_score(lower(coalesce(l.wine, '')), q.pp)
            )
            - CASE WHEN q.col IN ('red', 'white', 'rose') AND lower(l.colour) IN ('red', 'white', 'rose')
                        AND lower(l.colour) <> q.col THEN 0.15 ELSE 0 END)::real AS score
    FROM public.lwin_wine l, q
    WHERE q.pp <> ''
      AND (lower(l.producer) % q.pp OR q.pp <% lower(l.producer) OR q.pc <% lower(l.producer)
           OR q.pp <% lower(l.display_name) OR q.pc <% lower(l.display_name))
      AND NOT EXISTS (SELECT 1 FROM public.wine w WHERE w.lwin7 = l.lwin7)
  )
  SELECT * FROM (SELECT * FROM cellar UNION ALL SELECT * FROM lwin) c
  ORDER BY score DESC, source = 'lwin'
  LIMIT GREATEST(LEAST(max_rows, 20), 1)
$$;
GRANT EXECUTE ON FUNCTION public.match_label(text, text[], text, integer) TO authenticated;
