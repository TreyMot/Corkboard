DELETE FROM public.rating_private WHERE rating_id IN (
  SELECT r.id FROM public.rating r JOIN public.bottling b ON b.id = r.bottling_id JOIN public.wine w ON w.id = b.wine_id WHERE w.lwin7 = 'DEMO'
) OR user_id IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %');

DELETE FROM public.rating WHERE user_id IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %')
  OR bottling_id IN (SELECT b.id FROM public.bottling b JOIN public.wine w ON w.id = b.wine_id WHERE w.lwin7 = 'DEMO');

DELETE FROM public.wishlist_item WHERE user_id IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %')
  OR wine_id IN (SELECT id FROM public.wine WHERE lwin7 = 'DEMO');

DELETE FROM public.wine_edit_log WHERE wine_id IN (SELECT id FROM public.wine WHERE lwin7 = 'DEMO')
  OR user_id IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %');

DELETE FROM public.invite WHERE created_by IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %')
  OR used_by IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %');

DELETE FROM public.bottling WHERE wine_id IN (SELECT id FROM public.wine WHERE lwin7 = 'DEMO');

DELETE FROM public.wine WHERE lwin7 = 'DEMO';

DELETE FROM auth.users WHERE id IN (SELECT id FROM public.profile WHERE display_name LIKE '[demo] %');

DELETE FROM public.profile WHERE display_name LIKE '[demo] %';