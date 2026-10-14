-- AI(스킬 스크립트)용 개인 토큰과 덱 JSON 읽기·쓰기 함수.
-- 서버 코드 없이 PostgREST RPC 로 부른다: 토큰을 확인하고 그 사람 덱만 다룬다. 이미지는 다루지 않는다.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/003_ai_tokens.sql

begin;

create table carousel.api_tokens (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	name text not null default '',
	-- 토큰 원문은 저장하지 않는다(발급할 때 한 번만 보여 준다).
	token_hash bytea not null unique,
	created_at timestamptz not null default now(),
	last_used_at timestamptz
);
alter table carousel.api_tokens enable row level security;
create policy "내 토큰 보기" on carousel.api_tokens for select to authenticated using (user_id = auth.uid());
create policy "내 토큰 지우기" on carousel.api_tokens for delete to authenticated using (user_id = auth.uid());
grant select (id, name, created_at, last_used_at), delete on carousel.api_tokens to authenticated;

create function carousel.create_api_token(p_name text) returns text
	language plpgsql security definer set search_path = ''
as $$
declare
	t text;
begin
	if auth.uid() is null then
		raise exception '로그인이 필요해요';
	end if;
	t := 'cst_' || encode(extensions.gen_random_bytes(24), 'hex');
	insert into carousel.api_tokens (user_id, name, token_hash)
	values (auth.uid(), coalesce(p_name, ''), extensions.digest(t, 'sha256'));
	return t;
end $$;

-- 토큰 → 사용자. 함수 안에서만 쓴다(직접 호출 권한 없음).
create function carousel.token_user(p_token text) returns uuid
	language plpgsql security definer set search_path = ''
as $$
declare
	uid uuid;
begin
	update carousel.api_tokens set last_used_at = now()
	where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256')
	returning user_id into uid;
	if uid is null then
		raise exception '토큰이 올바르지 않거나 폐기됐어요' using errcode = 'PT401';
	end if;
	return uid;
end $$;

create function carousel.api_list(p_token text) returns jsonb
	language plpgsql security definer set search_path = ''
as $$
declare
	uid uuid := carousel.token_user(p_token);
begin
	return coalesce((
		select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'slides', jsonb_array_length(d.slides), 'updated_at', d.updated_at) order by d.updated_at desc)
		from carousel.decks d where d.owner_id = uid
	), '[]'::jsonb);
end $$;

create function carousel.api_get(p_token text, p_id uuid) returns jsonb
	language plpgsql security definer set search_path = ''
as $$
declare
	uid uuid := carousel.token_user(p_token);
	r jsonb;
begin
	select jsonb_build_object(
		'id', d.id, 'title', d.title, 'caption', d.caption, 'slides', d.slides, 'updated_at', d.updated_at,
		'watermark', coalesce((select p.watermark from carousel.profiles p where p.user_id = uid), '')
	) into r
	from carousel.decks d where d.id = p_id and d.owner_id = uid;
	if r is null then
		raise exception '덱을 찾을 수 없어요' using errcode = 'PT404';
	end if;
	return r;
end $$;

-- p_id 가 없으면 새 덱. p_expected(마지막으로 받은 updated_at)가 있으면 그 뒤 바뀐 덱은 덮어쓰지 않는다.
create function carousel.api_save(p_token text, p_deck jsonb, p_id uuid default null, p_expected timestamptz default null) returns jsonb
	language plpgsql security definer set search_path = ''
as $$
declare
	uid uuid := carousel.token_user(p_token);
	rid uuid;
	rat timestamptz;
begin
	if jsonb_typeof(p_deck -> 'slides') is distinct from 'array' then
		raise exception 'slides 는 배열이어야 해요' using errcode = 'PT400';
	end if;
	if p_id is null then
		insert into carousel.decks (owner_id, title, caption, slides)
		values (uid, coalesce(p_deck ->> 'title', '제목 없음'), coalesce(p_deck ->> 'caption', ''), p_deck -> 'slides')
		returning id, updated_at into rid, rat;
	else
		update carousel.decks
		set title = coalesce(p_deck ->> 'title', title), caption = coalesce(p_deck ->> 'caption', caption), slides = p_deck -> 'slides'
		where id = p_id and owner_id = uid and (p_expected is null or updated_at = p_expected)
		returning id, updated_at into rid, rat;
		if rid is null then
			if exists (select 1 from carousel.decks where id = p_id and owner_id = uid) then
				raise exception '마지막으로 받은 뒤 다른 곳에서 바뀌었어요. 다시 받아서 고쳐 주세요' using errcode = 'PT409';
			end if;
			raise exception '덱을 찾을 수 없어요' using errcode = 'PT404';
		end if;
	end if;
	return jsonb_build_object('id', rid, 'updated_at', rat);
end $$;

-- 함수는 기본으로 누구나 실행할 수 있으므로 거둬들이고 필요한 것만 연다.
revoke execute on all functions in schema carousel from public;
grant execute on function carousel.owns_deck(text) to authenticated;
grant execute on function carousel.create_api_token(text) to authenticated;
grant execute on function carousel.api_list(text) to anon, authenticated;
grant execute on function carousel.api_get(text, uuid) to anon, authenticated;
grant execute on function carousel.api_save(text, jsonb, uuid, timestamptz) to anon, authenticated;
-- 스킬 스크립트는 로그인 없이(anon 키 + 토큰) 부르므로 스키마 사용만 연다. 테이블 권한은 여전히 없다.
grant usage on schema carousel to anon;

commit;
