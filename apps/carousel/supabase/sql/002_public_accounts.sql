-- 누구나 가입해서 자기 덱만 다루게 바꾼다. 워터마크는 계정별 설정.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/002_public_accounts.sql

begin;

-- 같은 DB 를 쓰는 블로그 쪽: GitHub 가입자에게 public.profiles 를 만들던 트리거. 블로그 코드는 소유자 행만 읽고
-- 그 행은 이미 있으므로 필요 없다. 캐러셀 가입자가 블로그 데이터에 섞이지 않게 지운다.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 덱 소유자. 기존 덱은 내 계정 소유로(<OWNER_USER_ID> 를 바꿔서 적용).
alter table carousel.decks add column owner_id uuid references auth.users (id) on delete cascade;
update carousel.decks set owner_id = '<OWNER_USER_ID>' where owner_id is null;
alter table carousel.decks alter column owner_id set not null;
alter table carousel.decks alter column owner_id set default auth.uid();
create index decks_owner_idx on carousel.decks (owner_id, updated_at desc);

-- 워터마크는 덱이 아니라 계정에 둔다.
alter table carousel.decks drop column watermark;

create table carousel.profiles (
	user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
	watermark text not null default ''
);
insert into carousel.profiles (user_id, watermark) values ('<OWNER_USER_ID>', '@yeol.dev');  -- 내 워터마크

alter table carousel.profiles enable row level security;
create policy "내 설정" on carousel.profiles
	for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on carousel.profiles to authenticated;

-- 덱: 편집자 명단 대신 소유자.
drop policy "편집자만 덱을 다룬다" on carousel.decks;
create policy "내 덱" on carousel.decks
	for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 이미지: 경로 첫 폴더(<deck id>)의 덱 주인만.
create function carousel.owns_deck(deck text) returns boolean
	language sql stable security definer set search_path = ''
	as $$ select exists (select 1 from carousel.decks d where d.id::text = deck and d.owner_id = auth.uid()) $$;
grant execute on function carousel.owns_deck(text) to authenticated;

drop policy "carousel 편집자 읽기" on storage.objects;
drop policy "carousel 편집자 올리기" on storage.objects;
drop policy "carousel 편집자 바꾸기" on storage.objects;
drop policy "carousel 편집자 지우기" on storage.objects;
create policy "carousel 덱 주인 읽기" on storage.objects
	for select to authenticated using (bucket_id = 'carousel' and carousel.owns_deck((storage.foldername(name))[1]));
create policy "carousel 덱 주인 올리기" on storage.objects
	for insert to authenticated with check (bucket_id = 'carousel' and carousel.owns_deck((storage.foldername(name))[1]));
create policy "carousel 덱 주인 바꾸기" on storage.objects
	for update to authenticated using (bucket_id = 'carousel' and carousel.owns_deck((storage.foldername(name))[1]));
create policy "carousel 덱 주인 지우기" on storage.objects
	for delete to authenticated using (bucket_id = 'carousel' and carousel.owns_deck((storage.foldername(name))[1]));

-- 편집자 명단은 더 안 쓴다.
drop policy "본인 편집자 여부만 본다" on carousel.editors;
drop function carousel.is_editor();
drop table carousel.editors;

commit;
