-- One spelling per country, so the grid's Country filter has one "USA" and one "Spain".
-- Labels, LWIN and members write "United States", "U.S.A.", "España"; a trigger folds them
-- on every insert and edit. Countries not listed keep what was written.
CREATE OR REPLACE FUNCTION public.canonical_country(c text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT CASE
    WHEN k = '' THEN NULL
    WHEN k IN ('usa', 'us', 'u s', 'u s a', 'united states', 'united states of america',
               'america', 'estados unidos', 'etats unis') THEN 'USA'
    WHEN k IN ('spain', 'espana', 'espania', 'espanya') THEN 'Spain'
    WHEN k IN ('france', 'francia', 'frankreich') THEN 'France'
    WHEN k IN ('italy', 'italia', 'italie') THEN 'Italy'
    WHEN k IN ('germany', 'deutschland', 'allemagne', 'alemania') THEN 'Germany'
    WHEN k IN ('austria', 'osterreich', 'oesterreich', 'autriche') THEN 'Austria'
    WHEN k IN ('portugal') THEN 'Portugal'
    WHEN k IN ('greece', 'grece', 'grecia', 'hellas') THEN 'Greece'
    WHEN k IN ('hungary', 'magyarorszag') THEN 'Hungary'
    WHEN k IN ('argentina') THEN 'Argentina'
    WHEN k IN ('chile') THEN 'Chile'
    WHEN k IN ('australia', 'aus') THEN 'Australia'
    WHEN k IN ('new zealand', 'nz') THEN 'New Zealand'
    WHEN k IN ('south africa', 'rsa') THEN 'South Africa'
    ELSE btrim(c)
  END
  FROM (
    SELECT btrim(regexp_replace(regexp_replace(lower(unaccent(coalesce(c, ''))), '[^a-z ]', '', 'g'),
                                '\s+', ' ', 'g')) AS k
  ) q
$$;

CREATE OR REPLACE FUNCTION public.wine_canonical_country()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  NEW.country := public.canonical_country(NEW.country);
  RETURN NEW;
END
$$;

CREATE TRIGGER wine_canonical_country
  BEFORE INSERT OR UPDATE OF country ON public.wine
  FOR EACH ROW EXECUTE FUNCTION public.wine_canonical_country();

-- Fold the wines already logged (the trigger does the work).
UPDATE public.wine SET country = country WHERE country IS NOT NULL;
