CREATE TABLE public.job_token (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.job_token TO service_role;

ALTER TABLE public.job_token ENABLE ROW LEVEL SECURITY;