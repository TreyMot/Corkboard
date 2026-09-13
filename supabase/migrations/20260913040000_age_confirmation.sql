-- Corkboard is for adults 21 and over. The join flow requires the member to confirm it
-- and records when they did. Existing profiles (the dev preview member) stay null.
ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz;
