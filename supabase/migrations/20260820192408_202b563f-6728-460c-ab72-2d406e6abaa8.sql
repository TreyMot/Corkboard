ALTER TABLE public.wine ADD COLUMN IF NOT EXISTS varietal text;
ALTER TABLE public.wine ADD COLUMN IF NOT EXISTS varietal_raw text;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS wine_producer_trgm_idx ON public.wine USING gin (producer extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS wine_varietal_idx ON public.wine (varietal);

CREATE OR REPLACE FUNCTION public.search_producers(q text, max_rows integer DEFAULT 12)
RETURNS TABLE (producer text, wine_count bigint, score real)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT w.producer,
         count(*)::bigint AS wine_count,
         max(GREATEST(
           extensions.similarity(lower(w.producer), lower(q)),
           CASE WHEN lower(w.producer) LIKE '%' || lower(q) || '%' THEN 0.75 ELSE 0 END
         ))::real AS score
  FROM public.wine w
  WHERE q <> ''
    AND (
      lower(w.producer) LIKE '%' || lower(q) || '%'
      OR extensions.similarity(lower(w.producer), lower(q)) > 0.18
      OR lower(w.producer) % lower(q)
    )
  GROUP BY w.producer
  ORDER BY score DESC, count(*) DESC, w.producer
  LIMIT GREATEST(max_rows, 1)
$$;

GRANT EXECUTE ON FUNCTION public.search_producers(text, integer) TO authenticated;