-- The inviting profile only exists on the original Lovable project; skip on a fresh database.
insert into public.invite (code, created_by, expires_at)
select 'CORK-7QM4XZ', p.id, now() + interval '365 days'
from public.profile p
where p.id = 'a10c538d-494b-450c-9980-69bc0c9c3968'
on conflict (code) do nothing;
