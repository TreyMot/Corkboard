with demo as (
  select id, display_name,
         row_number() over (order by array_position(array['[demo] Dave','[demo] Carol','[demo] Jim','[demo] Susan','[demo] Marcy','[demo] Ray'], display_name)) as slot
  from public.profile where display_name like '[demo] %'
), spread as (
  select unnest(array[1,3,2,1,4,2,5,1,2,6,3,1,2,4,1,5,3,2,4,1]) as slot,
         generate_series(1,20) as rn
), r as (
  select id, row_number() over (order by drunk_on desc, created_at desc, id) as rn from public.rating
)
update public.rating t set user_id = d.id
from r join spread s on s.rn = r.rn join demo d on d.slot = s.slot
where t.id = r.id;

update public.rating_private p set user_id = r.user_id
from public.rating r where r.id = p.rating_id and p.user_id is distinct from r.user_id;