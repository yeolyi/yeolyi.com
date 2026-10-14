import { createClient } from "@supabase/supabase-js";

// 공개 읽기용 — 로그인 없이 anon 키로 RPC 만 호출한다(추천·조회수).
// 키는 쓰는 앱의 PUBLIC_ 환경 변수(레포 루트 .env).
export function createServerClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}
