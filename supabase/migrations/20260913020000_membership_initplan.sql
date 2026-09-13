-- Performance fix for 20260913010000: a bare is_member() in a policy runs once per row, and
-- lwin_wine has 185k rows, so match_label hit the statement timeout. Wrapping the call in a
-- scalar subquery makes Postgres evaluate it once per statement (an initPlan).
ALTER POLICY "members read all profiles" ON public.profile USING ((SELECT public.is_member()));
ALTER POLICY "members read wines" ON public.wine USING ((SELECT public.is_member()));
ALTER POLICY "members add wines" ON public.wine WITH CHECK (verified = false AND (SELECT public.is_member()));
ALTER POLICY "members correct wines" ON public.wine USING ((SELECT public.is_member())) WITH CHECK ((SELECT public.is_member()));
ALTER POLICY "members read bottlings" ON public.bottling USING ((SELECT public.is_member()));
ALTER POLICY "members add bottlings" ON public.bottling WITH CHECK ((SELECT public.is_member()));
ALTER POLICY "members read ratings" ON public.rating USING ((SELECT public.is_member()));
ALTER POLICY "own ratings insert" ON public.rating WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_member()));
ALTER POLICY "own private score" ON public.rating_private
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_member())) WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_member()));
ALTER POLICY "own wishlist all" ON public.wishlist_item
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_member())) WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_member()));
ALTER POLICY "own invites create" ON public.invite WITH CHECK ((SELECT auth.uid()) = created_by AND (SELECT public.is_member()));
ALTER POLICY "members write audit rows" ON public.wine_edit_log WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_member()));
ALTER POLICY "members read lwin" ON public.lwin_wine USING ((SELECT public.is_member()));
ALTER POLICY "members read rating photos" ON public.entry_photos
  USING ((rating_id IS NOT NULL OR owner_id = (SELECT auth.uid())) AND (SELECT public.is_member()));
ALTER POLICY "own entry photos insert" ON public.entry_photos WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND (SELECT public.is_member())
  AND (rating_id IS NULL OR EXISTS (SELECT 1 FROM public.rating r WHERE r.id = rating_id AND r.user_id = (SELECT auth.uid())))
  AND (wishlist_item_id IS NULL OR EXISTS (SELECT 1 FROM public.wishlist_item w WHERE w.id = wishlist_item_id AND w.user_id = (SELECT auth.uid())))
);

ALTER POLICY "members read avatars" ON storage.objects USING (bucket_id = 'avatars' AND (SELECT public.is_member()));
ALTER POLICY "members read entry photos" ON storage.objects USING (bucket_id = 'entry-photos' AND (SELECT public.is_member()));
ALTER POLICY "members upload entry photos" ON storage.objects
  WITH CHECK (bucket_id = 'entry-photos' AND owner = (SELECT auth.uid()) AND (SELECT public.is_member()));
ALTER POLICY "own avatar upload" ON storage.objects
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND (SELECT public.is_member()));
