-- 베타 의견. 서비스 안 /feedback 화면이 보낸다. 누구나 쓰기만 하고 읽기는 막는다(읽는 건 Supabase 화면·service_role).
-- 저장하는 건 사용자가 직접 쓴 글과 보던 주소뿐이다(연락처도 받지 않는다). 개인화 답은 보내지 않는다.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/003_feedback.sql
begin;

create table house.feedback (
	id bigint generated always as identity primary key,
	created_at timestamptz not null default now(),
	body text not null check (char_length(body) between 1 and 2000),
	page text check (char_length(page) <= 200)
);
alter table house.feedback enable row level security;
create policy "누구나 의견을 남긴다" on house.feedback for insert to anon, authenticated with check (true);
grant insert (body, page) on house.feedback to anon, authenticated;

commit;
