-- api_save 가 버킷에 없는 이미지를 가리키는 덱을 거절한다.
-- 스크립트가 업로드보다 덱 저장을 먼저 하면 편집기에 깨진 이미지가 뜨던 것을 막는다(업로드 → 저장 순서를 강제).
-- 이미지 레이어의 src 와 코드 레이어 props 안의 "assets/…" 문자열(깊이 상관없이)을 본다. 편집기의 저장(테이블 직접 쓰기)은 그대로다.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/005_save_checks_assets.sql

begin;

-- 덱 JSON 이 쓰는 이미지 경로들. 함수 안에서만 쓴다.
create function carousel.deck_assets(p_slides jsonb) returns setof text
	language sql immutable set search_path = ''
as $$
	select distinct v #>> '{}'
	from jsonb_array_elements(coalesce(p_slides, '[]'::jsonb)) s,
		jsonb_array_elements(coalesce(s -> 'layers', '[]'::jsonb)) l,
		lateral (
			select l -> 'src' as v where l ->> 'type' = 'image'
			union all
			select p.v from jsonb_path_query(l -> 'props', 'strict $.**') p(v) where l ->> 'type' = 'code'
		) x
	where jsonb_typeof(v) = 'string' and v #>> '{}' like 'assets/%'
$$;

create or replace function carousel.api_save(p_token text, p_deck jsonb, p_id uuid default null, p_expected timestamptz default null) returns jsonb
	language plpgsql security definer set search_path = ''
as $$
declare
	uid uuid := carousel.token_user(p_token);
	rid uuid;
	rat timestamptz;
	missing text;
begin
	if jsonb_typeof(p_deck -> 'slides') is distinct from 'array' then
		raise exception 'slides 는 배열이어야 해요' using errcode = 'PT400';
	end if;
	-- 새 덱은 아직 버킷 폴더가 없으니 이미지를 넣을 수 없다(만든 뒤 upload → put).
	select string_agg(a, ', ') into missing
	from carousel.deck_assets(p_deck -> 'slides') a
	where p_id is null
		or not exists (select 1 from storage.objects o where o.bucket_id = 'carousel' and o.name = p_id::text || '/' || a);
	if missing is not null then
		raise exception '버킷에 없는 이미지예요: %. 먼저 upload 로 올려 주세요', missing using errcode = 'PT400';
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

revoke execute on function carousel.deck_assets(jsonb) from public;
revoke execute on function carousel.api_save(text, jsonb, uuid, timestamptz) from public;
grant execute on function carousel.api_save(text, jsonb, uuid, timestamptz) to anon, authenticated;

commit;
