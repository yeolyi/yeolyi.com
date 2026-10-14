import { createClient } from "@supabase/supabase-js";

// 블로그와 같은 Supabase 프로젝트. 지표 표(analytics 스키마)는 API 로 열려 있지 않고, public.stats 함수가 관리자인지 보고 집계만 돌려준다.
export const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
