-- 한 번만: 예전 조회수(public.page_views, 블로그가 경로 하나에 숫자 하나로 세던 것)를 analytics.page_views 의 시작값으로 옮긴다.
-- 예전 키는 블로그 경로 그대로라 정리한다: /ko·/en 접두사와 끝 / 를 떼고, /cs 아래는 cs 사이트로 옮긴다.
with old as (
	select
		regexp_replace(regexp_replace(post_id, '^/(ko|en)(?=/|$)', ''), '(.)/$', '\1') as p,
		view_count
	from public.page_views
),
norm as (
	select
		case when p = '/cs' or p like '/cs/%' then 'cs' else 'blog' end as site,
		case when p = '/cs' then '/' when p like '/cs/%' then substr(p, 4) when p = '' then '/' else p end as path,
		view_count
	from old
)
insert into analytics.page_views (site, path, count)
select site, path, sum(view_count) from norm group by 1, 2
on conflict (site, path) do update set count = analytics.page_views.count + excluded.count;
