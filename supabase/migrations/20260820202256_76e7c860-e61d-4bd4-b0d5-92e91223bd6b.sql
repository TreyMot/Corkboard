-- 1. six demo accounts
with names(idx, nm) as (
  values (1,'Dave'),(2,'Carol'),(3,'Jim'),(4,'Susan'),(5,'Marcy'),(6,'Ray')
), ins as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         'demo+' || lower(nm) || '@corkboard.invalid', '',
         now(), now(), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', nm),
         '', '', '', ''
  from names
  returning id, raw_user_meta_data->>'display_name' as nm
)
insert into public.profile (id, display_name)
select id, '[demo] ' || nm from ins;

-- 2. uneven reassignment of the 20 seeded ratings
with demo as (
  select id, display_name,
         row_number() over (order by array_position(array['[demo] Dave','[demo] Carol','[demo] Jim','[demo] Susan','[demo] Marcy','[demo] Ray'], display_name)) as slot
  from public.profile where display_name like '[demo] %'
), spread as (
  -- 6 / 5 / 3 / 3 / 2 / 1
  select unnest(array[1,1,1,1,1,1, 2,2,2,2,2, 3,3,3, 4,4,4, 5,5, 6]) as slot,
         generate_series(1,20) as rn
), r as (
  select id, row_number() over (order by drunk_on, created_at, id) as rn from public.rating
)
update public.rating t
set user_id = d.id
from r join spread s on s.rn = r.rn join demo d on d.slot = s.slot
where t.id = r.id;

-- keep private scores with their rating's author
update public.rating_private p
set user_id = r.user_id
from public.rating r
where r.id = p.rating_id and p.user_id is distinct from r.user_id;

-- 3. wishlist across three of them
with demo as (
  select id, row_number() over (order by array_position(array['[demo] Carol','[demo] Susan','[demo] Ray'], display_name)) as slot
  from public.profile where display_name in ('[demo] Carol','[demo] Susan','[demo] Ray')
), spread as (
  select unnest(array[1,1,2,2,3]) as slot, generate_series(1,5) as rn
), w as (
  select id, row_number() over (order by created_at, id) as rn from public.wishlist_item
)
update public.wishlist_item t
set user_id = d.id
from w join spread s on s.rn = w.rn join demo d on d.slot = s.slot
where t.id = w.id;