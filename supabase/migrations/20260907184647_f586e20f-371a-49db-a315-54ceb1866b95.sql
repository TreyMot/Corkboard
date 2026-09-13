CREATE TABLE public.entry_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid REFERENCES public.rating(id) ON DELETE CASCADE,
  wishlist_item_id uuid REFERENCES public.wishlist_item(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  thumb_path text NOT NULL,
  kind text NOT NULL DEFAULT 'front' CHECK (kind IN ('front','back','pour','shelf','other')),
  is_primary boolean NOT NULL DEFAULT false,
  width int,
  height int,
  bytes int,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entry_photos_one_parent CHECK (num_nonnulls(rating_id, wishlist_item_id) = 1)
);

CREATE UNIQUE INDEX entry_photos_primary_rating_idx
  ON public.entry_photos (rating_id) WHERE is_primary AND deleted_at IS NULL AND rating_id IS NOT NULL;
CREATE UNIQUE INDEX entry_photos_primary_wishlist_idx
  ON public.entry_photos (wishlist_item_id) WHERE is_primary AND deleted_at IS NULL AND wishlist_item_id IS NOT NULL;
CREATE INDEX entry_photos_rating_idx ON public.entry_photos (rating_id) WHERE deleted_at IS NULL;
CREATE INDEX entry_photos_wishlist_idx ON public.entry_photos (wishlist_item_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_photos TO authenticated;
GRANT ALL ON public.entry_photos TO service_role;

ALTER TABLE public.entry_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read rating photos"
  ON public.entry_photos FOR SELECT TO authenticated
  USING (rating_id IS NOT NULL OR owner_id = auth.uid());

CREATE POLICY "own entry photos insert"
  ON public.entry_photos FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (rating_id IS NULL OR EXISTS (SELECT 1 FROM public.rating r WHERE r.id = rating_id AND r.user_id = auth.uid()))
    AND (wishlist_item_id IS NULL OR EXISTS (SELECT 1 FROM public.wishlist_item w WHERE w.id = wishlist_item_id AND w.user_id = auth.uid()))
  );

CREATE POLICY "own entry photos update"
  ON public.entry_photos FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "own entry photos delete"
  ON public.entry_photos FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE VIEW public.entry_photos_active
  WITH (security_invoker = true) AS
  SELECT id, rating_id, wishlist_item_id, owner_id, storage_path, thumb_path, kind, is_primary, width, height, bytes, created_at
  FROM public.entry_photos
  WHERE deleted_at IS NULL;

GRANT SELECT ON public.entry_photos_active TO authenticated;
GRANT ALL ON public.entry_photos_active TO service_role;