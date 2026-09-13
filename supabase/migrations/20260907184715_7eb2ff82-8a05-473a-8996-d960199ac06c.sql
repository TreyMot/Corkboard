CREATE POLICY "members read entry photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'entry-photos');

CREATE POLICY "members upload entry photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entry-photos' AND owner = auth.uid());

CREATE POLICY "members update own entry photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'entry-photos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'entry-photos' AND owner = auth.uid());

CREATE POLICY "members delete own entry photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entry-photos' AND owner = auth.uid());