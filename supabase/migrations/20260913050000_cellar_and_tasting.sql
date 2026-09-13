-- Bottles can sit in the cellar unopened (gifts, bottles bought to try): no stars and no
-- date until they're tasted. A rated bottle still needs its date.
ALTER TABLE public.rating ALTER COLUMN stars DROP NOT NULL;
ALTER TABLE public.rating ALTER COLUMN drunk_on DROP NOT NULL;
ALTER TABLE public.rating
  ADD CONSTRAINT rating_opened_has_date CHECK (stars IS NULL OR drunk_on IS NOT NULL);

-- Personal tasting notes, picked from a per-style list in the app (src/lib/tasting.ts).
ALTER TABLE public.rating
  ADD COLUMN IF NOT EXISTS tasting_notes text[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(tasting_notes) <= 40);

-- Photo files: members could read any file in the bucket, which exposed wishlist photos the
-- privacy page calls private. Now: your own files, or files behind a bottle (rating) photo.
-- ponytail: path lookups scan entry_photos; index storage_path/thumb_path if photos reach the thousands.
ALTER POLICY "members read entry photos" ON storage.objects USING (
  bucket_id = 'entry-photos'
  AND (SELECT public.is_member())
  AND (
    owner = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.entry_photos e
      WHERE e.rating_id IS NOT NULL
        AND (e.storage_path = objects.name OR e.thumb_path = objects.name)
    )
  )
);

-- Moving a photo (wishlist to bottle) must land on an entry you own, as inserting does.
ALTER POLICY "own entry photos update" ON public.entry_photos
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (SELECT public.is_member())
    AND (entry_photos.rating_id IS NULL OR EXISTS (
      SELECT 1 FROM public.rating r
      WHERE r.id = entry_photos.rating_id AND r.user_id = (SELECT auth.uid())))
    AND (entry_photos.wishlist_item_id IS NULL OR EXISTS (
      SELECT 1 FROM public.wishlist_item w
      WHERE w.id = entry_photos.wishlist_item_id AND w.user_id = (SELECT auth.uid())))
  );
