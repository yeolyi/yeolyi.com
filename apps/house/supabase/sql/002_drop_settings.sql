-- 개인화 정보를 서버에 두지 않기로 해(브라우저에만, 내보내기·가져오기로 옮긴다) 메일과 함께 걷어 낸다. 2026-10-13 적용.
-- 적용: supabase db query --linked --project-ref <PROJECT_REF> -f supabase/sql/002_drop_settings.sql
-- Edge Function house-digest 와 비밀값 RESEND_API_KEY·MAIL_FROM 은 CLI 로 지웠다(supabase functions delete / secrets unset).
select cron.unschedule('house-digest');
drop table if exists house.mail_log;
drop table if exists house.profiles;
drop function if exists house.touch();
