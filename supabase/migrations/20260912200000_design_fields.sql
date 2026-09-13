-- Fields the Corkboard Home design needs, plus the storage buckets the Lovable
-- project created by hand (their policies already exist in earlier migrations).

-- Colour in the glass: the six-step ramp. Separate from `colour` (the style:
-- red, white, rose...). Null means "derive from style" in the app.
ALTER TABLE public.wine
  ADD COLUMN IF NOT EXISTS vineyard text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS glass text
    CHECK (glass IS NULL OR glass IN ('straw','gold','onion','violet','garnet','tawny'));

-- Where a member drank it. Shared with the circle, like the note.
ALTER TABLE public.rating
  ADD COLUMN IF NOT EXISTS place text CHECK (place IS NULL OR char_length(place) <= 200);

-- Bottles in the rack stay private to the member, next to the 100-point score.
ALTER TABLE public.rating_private
  ADD COLUMN IF NOT EXISTS bottles_owned integer NOT NULL DEFAULT 0 CHECK (bottles_owned >= 0 AND bottles_owned <= 9999);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false), ('entry-photos', 'entry-photos', false)
ON CONFLICT (id) DO NOTHING;
