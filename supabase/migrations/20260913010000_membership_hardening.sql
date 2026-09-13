-- Ship gate blocker: policies trusted any signed-in account, and Supabase sign-up was open,
-- so anyone holding the public key could create an account and read the whole circle.
-- Membership (a profile row) is now required by every policy, and only the server-side
-- invite flow (service role) can create a profile.

CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER -- reads profile past its own RLS, which itself calls is_member()
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profile WHERE id = (SELECT auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.is_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member() TO authenticated;

-- Profiles are created by the join flow and the dev preview helper, both service role.
DROP POLICY IF EXISTS "own profile insert" ON public.profile;
REVOKE INSERT ON public.profile FROM authenticated;

ALTER POLICY "members read all profiles" ON public.profile USING (public.is_member());
ALTER POLICY "members read wines" ON public.wine USING (public.is_member());
ALTER POLICY "members add wines" ON public.wine WITH CHECK (verified = false AND public.is_member());
ALTER POLICY "members correct wines" ON public.wine USING (public.is_member()) WITH CHECK (public.is_member());
ALTER POLICY "members read bottlings" ON public.bottling USING (public.is_member());
ALTER POLICY "members add bottlings" ON public.bottling WITH CHECK (public.is_member());
ALTER POLICY "members read ratings" ON public.rating USING (public.is_member());
ALTER POLICY "own ratings insert" ON public.rating WITH CHECK (auth.uid() = user_id AND public.is_member());
ALTER POLICY "own private score" ON public.rating_private
  USING (auth.uid() = user_id AND public.is_member()) WITH CHECK (auth.uid() = user_id AND public.is_member());
ALTER POLICY "own wishlist all" ON public.wishlist_item
  USING (auth.uid() = user_id AND public.is_member()) WITH CHECK (auth.uid() = user_id AND public.is_member());
ALTER POLICY "own invites create" ON public.invite WITH CHECK (auth.uid() = created_by AND public.is_member());
ALTER POLICY "members write audit rows" ON public.wine_edit_log WITH CHECK (auth.uid() = user_id AND public.is_member());
ALTER POLICY "members read lwin" ON public.lwin_wine USING (public.is_member());
ALTER POLICY "members read rating photos" ON public.entry_photos
  USING ((rating_id IS NOT NULL OR owner_id = auth.uid()) AND public.is_member());
ALTER POLICY "own entry photos insert" ON public.entry_photos WITH CHECK (
  owner_id = auth.uid()
  AND public.is_member()
  AND (rating_id IS NULL OR EXISTS (SELECT 1 FROM public.rating r WHERE r.id = rating_id AND r.user_id = auth.uid()))
  AND (wishlist_item_id IS NULL OR EXISTS (SELECT 1 FROM public.wishlist_item w WHERE w.id = wishlist_item_id AND w.user_id = auth.uid()))
);

ALTER POLICY "members read avatars" ON storage.objects USING (bucket_id = 'avatars' AND public.is_member());
ALTER POLICY "members read entry photos" ON storage.objects USING (bucket_id = 'entry-photos' AND public.is_member());
ALTER POLICY "members upload entry photos" ON storage.objects
  WITH CHECK (bucket_id = 'entry-photos' AND owner = auth.uid() AND public.is_member());
ALTER POLICY "own avatar upload" ON storage.objects
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_member());

-- Grants hygiene: the Data API can't issue these, but no client role needs them.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon, authenticated;

-- Linter: pin the search path (it only calls built-ins).
ALTER FUNCTION public.label_core(text) SET search_path = '';

-- Photo buckets: private already; now bounded. The app uploads re-encoded JPEG or WebP.
UPDATE storage.buckets
SET file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('entry-photos', 'avatars');

-- Server-side length limits to match the forms (client limits are only a convenience).
ALTER TABLE public.rating ADD CONSTRAINT rating_note_length CHECK (note IS NULL OR char_length(note) <= 2000);
ALTER TABLE public.wishlist_item ADD CONSTRAINT wishlist_note_length CHECK (note IS NULL OR char_length(note) <= 2000);
ALTER TABLE public.profile ADD CONSTRAINT profile_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 60);
ALTER TABLE public.wine ADD CONSTRAINT wine_text_lengths CHECK (
  char_length(producer) BETWEEN 1 AND 300
  AND coalesce(char_length(cuvee), 0) <= 300
  AND coalesce(char_length(region), 0) <= 300
  AND coalesce(char_length(vineyard), 0) <= 300
  AND coalesce(char_length(location), 0) <= 300
  AND coalesce(char_length(country), 0) <= 100
  AND coalesce(char_length(varietal), 0) <= 200
  AND coalesce(char_length(varietal_raw), 0) <= 200
);
