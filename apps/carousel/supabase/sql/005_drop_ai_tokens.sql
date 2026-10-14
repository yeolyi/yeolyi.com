-- AI 연결(개인 토큰으로 남이 덱을 다루는 RPC)을 없앤다. AI 는 편집기 주인의 맥에서만 쓴다(pnpm pull/push, Supabase CLI).
-- 003_ai_tokens.sql·004_auto_token.sql 이 만든 것을 지우고, 003 이 anon 에 열었던 스키마 사용 권한을 001 처럼 다시 닫는다.
-- owns_deck 는 001 의 Storage 정책이 쓰므로 둔다.
begin;

drop function if exists carousel.api_save(text, jsonb, uuid, timestamptz);
drop function if exists carousel.api_get(text, uuid);
drop function if exists carousel.api_list(text);
drop function if exists carousel.token_user(text);
drop function if exists carousel.create_api_token(text);
drop function if exists carousel.my_api_token();
drop function if exists carousel.reissue_api_token();
drop table if exists carousel.api_tokens;

revoke usage on schema carousel from anon;

commit;
