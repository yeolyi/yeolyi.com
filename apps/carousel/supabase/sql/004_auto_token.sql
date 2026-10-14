-- AI 토큰 자동 발급. 홈의 "AI 사용법" 카드가 프롬프트에 토큰을 넣어 보여 주므로 원문을 본인만 다시 읽을 수 있게 둔다.
-- (조회는 여전히 해시로 한다. 원문은 아래 함수로만, 본인 것만 나간다.)
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/004_auto_token.sql

begin;

alter table carousel.api_tokens add column token text;

-- 사용자당 토큰 하나. 없거나 원문이 없는 예전 토큰뿐이면 새로 만든다.
create function carousel.my_api_token() returns text
	language plpgsql security definer set search_path = ''
as $$
declare
	t text;
begin
	if auth.uid() is null then
		raise exception '로그인이 필요해요' using errcode = 'PT401';
	end if;
	select token into t from carousel.api_tokens where user_id = auth.uid() and token is not null limit 1;
	if t is null then
		delete from carousel.api_tokens where user_id = auth.uid();
		t := 'cst_' || encode(extensions.gen_random_bytes(24), 'hex');
		insert into carousel.api_tokens (user_id, name, token_hash, token)
		values (auth.uid(), 'AI', extensions.digest(t, 'sha256'), t);
	end if;
	return t;
end $$;

-- 재발급: 이전 토큰은 바로 쓸 수 없게 된다.
create function carousel.reissue_api_token() returns text
	language plpgsql security definer set search_path = ''
as $$
begin
	if auth.uid() is null then
		raise exception '로그인이 필요해요' using errcode = 'PT401';
	end if;
	delete from carousel.api_tokens where user_id = auth.uid();
	return carousel.my_api_token();
end $$;

revoke execute on function carousel.my_api_token() from public;
revoke execute on function carousel.reissue_api_token() from public;
grant execute on function carousel.my_api_token() to authenticated;
grant execute on function carousel.reissue_api_token() to authenticated;

commit;
