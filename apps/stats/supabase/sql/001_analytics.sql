-- 방문 지표. yeolyi.com 과 그 아래 서비스(그리고 chad-cn.com 같은 바깥 사이트)가 같은 표에 쌓는다.
-- 쿠키 없이 하루 단위 익명 해시로만 방문자를 가른다: 해시 = sha256(그날 salt + IP + UA), salt 는 이틀 뒤 지운다.
-- 그래서 같은 날 같은 사람은 묶이지만 날을 넘거나 지난 데이터를 사람으로 되짚을 수는 없다.

create schema if not exists analytics;

create table analytics.events (
	id bigint generated always as identity primary key,
	at timestamptz not null default now(),
	site text not null check (site ~ '^[a-z][a-z0-9-]{0,19}$'),
	path text not null,
	referrer text, -- 바깥에서 왔을 때 그 호스트(google.com 등). 같은 사이트 안 이동은 비운다
	visitor text not null,
	device text not null check (device in ('mobile', 'tablet', 'desktop'))
);
create index on analytics.events (at);
create index on analytics.events (site, at);

create table analytics.salts (
	day date primary key,
	salt text not null default encode(extensions.gen_random_bytes(16), 'hex')
);

-- 글 조회수. 이벤트를 넣을 때 같이 올린다(읽을 때마다 세지 않게).
create table analytics.page_views (
	site text not null,
	path text not null,
	count bigint not null default 0,
	primary key (site, path)
);

-- 대시보드를 볼 수 있는 사람.
create table analytics.admins (
	user_id uuid primary key references auth.users (id) on delete cascade
);

-- 스키마는 API 로 열지 않는다. 바깥에서는 아래 public 함수로만 들어온다.
revoke all on schema analytics from anon, authenticated;

-- 수집. 브라우저가 anon 키로 /rest/v1/rpc/track 을 부른다. IP·UA 는 요청 헤더에서 읽는다.
create or replace function public.track(p_site text, p_path text, p_referrer text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	h json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
	ua text := coalesce(h ->> 'user-agent', '');
	ip text := trim(split_part(coalesce(h ->> 'cf-connecting-ip', h ->> 'x-forwarded-for', ''), ',', 1));
	today date := (now() at time zone 'Asia/Seoul')::date;
	s text;
begin
	if ua = '' or ua ~* '(bot|crawl|spider|slurp|headless|lighthouse|preview|scrap|facebookexternalhit|curl|wget|python)' then
		return;
	end if;
	if length(p_path) > 300 then
		return;
	end if;

	insert into analytics.salts (day) values (today) on conflict do nothing;
	select salt into s from analytics.salts where day = today;

	insert into analytics.events (site, path, referrer, visitor, device)
	values (
		p_site,
		p_path,
		nullif(left(p_referrer, 200), ''),
		left(encode(extensions.digest(s || ip || ua, 'sha256'), 'hex'), 16),
		case
			when ua ~* '(ipad|tablet)' then 'tablet'
			when ua ~* '(mobi|android|iphone)' then 'mobile'
			else 'desktop'
		end
	);

	insert into analytics.page_views (site, path, count) values (p_site, p_path, 1)
	on conflict (site, path) do update set count = analytics.page_views.count + 1;
end;
$$;

-- 글 조회수. 누구나 읽는다.
create or replace function public.page_view_count(p_site text, p_path text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
	select coalesce((select count from analytics.page_views where site = p_site and path = p_path), 0);
$$;

-- 대시보드. 관리자만. 기간 [p_from, p_to), 사이트(null 이면 전체), 그래프 단위(hour·day·month).
-- 방문자는 하루 단위 해시라 여러 날을 묶으면 "날마다의 방문자"를 더한 값에 가깝다.
create or replace function public.stats(p_site text, p_from timestamptz, p_to timestamptz, p_bucket text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	result json;
begin
	if not exists (select 1 from analytics.admins where user_id = auth.uid()) then
		raise exception 'forbidden' using errcode = '42501';
	end if;
	if p_bucket not in ('hour', 'day', 'month') then
		raise exception 'bad bucket';
	end if;

	with e as (
		select * from analytics.events
		where at >= p_from and at < p_to and (p_site is null or site = p_site)
	),
	buckets as (
		select generate_series(
			date_trunc(p_bucket, p_from at time zone 'Asia/Seoul'),
			date_trunc(p_bucket, (p_to - interval '1 microsecond') at time zone 'Asia/Seoul'),
			('1 ' || p_bucket)::interval
		) as t
	)
	select json_build_object(
		'views', (select count(*) from e),
		'visitors', (select count(distinct visitor) from e),
		'live', (
			select count(distinct visitor) from analytics.events
			where at > now() - interval '5 minutes' and (p_site is null or site = p_site)
		),
		'series', (
			select coalesce(json_agg(json_build_object('t', b.t, 'views', coalesce(x.views, 0), 'visitors', coalesce(x.visitors, 0)) order by b.t), '[]')
			from buckets b
			left join (
				select date_trunc(p_bucket, at at time zone 'Asia/Seoul') as t, count(*) as views, count(distinct visitor) as visitors
				from e group by 1
			) x using (t)
		),
		'sites', (
			select coalesce(json_agg(r order by r.views desc), '[]')
			from (select site as key, count(*) as views, count(distinct visitor) as visitors from e group by 1) r
		),
		'pages', (
			select coalesce(json_agg(r order by r.views desc), '[]')
			from (select site, path as key, count(*) as views, count(distinct visitor) as visitors from e group by 1, 2 order by 4 desc limit 30) r
		),
		'referrers', (
			select coalesce(json_agg(r order by r.visitors desc), '[]')
			from (select referrer as key, count(*) as views, count(distinct visitor) as visitors from e where referrer is not null group by 1 order by 3 desc limit 30) r
		),
		'devices', (
			select coalesce(json_agg(r order by r.visitors desc), '[]')
			from (select device as key, count(*) as views, count(distinct visitor) as visitors from e group by 1) r
		)
	) into result;
	return result;
end;
$$;

revoke all on function public.track, public.page_view_count, public.stats from public;
grant execute on function public.track, public.page_view_count to anon, authenticated;
grant execute on function public.stats to authenticated;

-- 정리: 지난 salt 는 바로 지우고(되짚기 방지), 원본 이벤트는 13개월만 둔다.
select cron.schedule(
	'analytics-cleanup',
	'17 3 * * *',
	$$
	delete from analytics.salts where day < (now() at time zone 'Asia/Seoul')::date - 1;
	delete from analytics.events where at < now() - interval '13 months';
	$$
);
