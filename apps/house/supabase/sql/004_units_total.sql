-- 청약홈 주택형의 SUPLY_HSHLDCO 를 전체 세대로 잘못 읽어 units[].total 이 일반공급 세대 수였다.
-- 수집기를 고친(total = 일반 + 특공) 뒤 이미 쌓인 청약홈 공고도 같게 맞춘다. 마이홈(LH) 공고는 건드리지 않는다.
-- 여러 번 돌려도 된다: 아직 옛 꼴인 공고(주택형 total 합 + special 합 = 공고 총세대, 특공 > 0)만 고친다.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/004_units_total.sql
with sums as (
  select id,
    (select sum((u->>'total')::int) from jsonb_array_elements(data->'units') u) as t,
    (select sum(coalesce((u->>'special')::int, 0)) from jsonb_array_elements(data->'units') u) as sp,
    (data->>'totalUnits')::int as tot
  from house.notices
  where data->>'source' = 'applyhome' and jsonb_typeof(data->'units') = 'array'
)
update house.notices n
set data = jsonb_set(
  n.data,
  '{units}',
  (
    select coalesce(jsonb_agg(jsonb_set(u, '{total}', to_jsonb((u->>'total')::int + coalesce((u->>'special')::int, 0)))), '[]'::jsonb)
    from jsonb_array_elements(n.data->'units') u
  )
)
from sums
where sums.id = n.id and sums.sp > 0 and sums.t + sums.sp = sums.tot;
