-- house 스키마. blog-seoul 프로젝트에 같이 산다(무료 플랜 프로젝트 수 제한).
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/001_house.sql
-- (블로그 레포가 supabase_migrations 이력을 관리하므로 db push 를 쓰지 않는다.)
--
-- 공고(notices)는 누구나 읽고 수집기(service role)만 쓴다. 판정은 사람마다 달라 저장하지 않는다.
-- 개인화 정보는 서버에 두지 않는다(브라우저에만). 예전의 profiles·mail_log 표와 메일 함수는 002 에서 지웠다.

begin;

create schema if not exists house;

create table house.notices (
	id text primary key, -- ah:<HOUSE_MANAGE_NO>:<PBLANC_NO> · mh:<pblancId>
	data jsonb not null, -- shared/types.ts 의 Notice
	apply_end date not null, -- shared/site.ts applyEnd. 화면은 최근 것만 받는다
	updated_at timestamptz not null default now()
);
create index notices_apply_end on house.notices (apply_end);

-- 수집 실행 기록. 화면 맨 아래 상태 줄이 마지막 수집이 실패하거나 멈췄을 때 알린다.
create table house.runs (
	id bigint generated always as identity primary key,
	job text not null check (job in ('collect', 'digest')),
	finished_at timestamptz not null default now(),
	error text,
	stats jsonb not null default '{}'::jsonb
);
create index runs_job_finished on house.runs (job, finished_at desc);

alter table house.notices enable row level security;
alter table house.runs enable row level security;

create policy "누구나 공고를 읽는다" on house.notices for select to anon, authenticated using (true);
create policy "누구나 수집 기록을 읽는다" on house.runs for select to anon, authenticated using (job = 'collect');

grant usage on schema house to anon, authenticated, service_role;
grant select on house.notices, house.runs to anon, authenticated;
grant all on all tables in schema house to service_role;

commit;

-- 예약 실행: 매시 7분 수집.
-- Edge Function 은 verify_jwt 를 끄고 x-cron-secret 헤더로 막는다. 비밀값은 Vault 와 함수 비밀값(CRON_SECRET)에 같은 값을 넣는다.
--   select vault.create_secret('<무작위 문자열>', 'house_cron_secret');
-- 함수 주소의 <PROJECT_REF> 는 바꿔서 넣는다.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('house-collect', '7 * * * *', $$
	select net.http_post(
		url := 'https://<PROJECT_REF>.supabase.co/functions/v1/house-collect',
		headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'house_cron_secret')),
		timeout_milliseconds := 150000
	)
$$);
