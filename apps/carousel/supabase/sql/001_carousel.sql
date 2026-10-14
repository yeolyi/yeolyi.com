-- carousel 스키마. blog-seoul 프로젝트에 같이 산다(무료 플랜 프로젝트 수 제한).
-- 블로그 가입자(auth.users)와 같은 인증을 쓰므로, carousel.editors 에 든 사람만 읽고 쓴다.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/001_carousel.sql
-- (블로그 레포가 supabase_migrations 이력을 관리하므로 db push 를 쓰지 않는다.)

begin;

create schema if not exists carousel;

create table carousel.editors (
	user_id uuid primary key references auth.users (id) on delete cascade
);

create table carousel.decks (
	id uuid primary key default gen_random_uuid(),
	title text not null default '제목 없음',
	caption text not null default '',
	watermark text not null default '@yeol.dev',
	slides jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create function carousel.is_editor() returns boolean
	language sql stable security definer set search_path = ''
	as $$ select exists (select 1 from carousel.editors where user_id = auth.uid()) $$;

create function carousel.touch() returns trigger
	language plpgsql set search_path = ''
	as $$ begin new.updated_at = now(); return new; end $$;

create trigger decks_touch before update on carousel.decks
	for each row execute function carousel.touch();

alter table carousel.editors enable row level security;
alter table carousel.decks enable row level security;

create policy "본인 편집자 여부만 본다" on carousel.editors
	for select to authenticated using (user_id = auth.uid());

create policy "편집자만 덱을 다룬다" on carousel.decks
	for all to authenticated using (carousel.is_editor()) with check (carousel.is_editor());

grant usage on schema carousel to authenticated;
grant select on carousel.editors to authenticated;
grant select, insert, update, delete on carousel.decks to authenticated;
grant execute on function carousel.is_editor() to authenticated;
revoke all on schema carousel from anon;

-- 이미지: 비공개 버킷. 경로는 <deck id>/<파일 이름>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('carousel', 'carousel', false, 20971520, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

create policy "carousel 편집자 읽기" on storage.objects
	for select to authenticated using (bucket_id = 'carousel' and carousel.is_editor());
create policy "carousel 편집자 올리기" on storage.objects
	for insert to authenticated with check (bucket_id = 'carousel' and carousel.is_editor());
create policy "carousel 편집자 바꾸기" on storage.objects
	for update to authenticated using (bucket_id = 'carousel' and carousel.is_editor());
create policy "carousel 편집자 지우기" on storage.objects
	for delete to authenticated using (bucket_id = 'carousel' and carousel.is_editor());

-- 다른 곳(Claude 의 push)에서 고친 덱을 열린 편집기가 바로 받도록.
alter publication supabase_realtime add table carousel.decks;

-- 편집자: 내 auth.users id 로 바꿔서 적용
insert into carousel.editors (user_id) values ('<OWNER_USER_ID>');

commit;
