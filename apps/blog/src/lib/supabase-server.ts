import {
  createServerClient as createSSRServerClient,
  parseCookieHeader,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import type { Database } from "@/database.types";

// 공개 읽기용 — 로그인 없이 anon 키로 RPC 만 호출한다. 세션·쿠키 처리가 없어
// 정적 페이지의 공개 액션(좋아요·조회수 등)에서 쓴다.
export function createServerClient() {
  return createClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}

// 인증용 — 쿠키 기반 서버 세션. 보호 라우트(prerender=false)와 인증 액션에서만
// 쓴다. 이 클라이언트를 import 하는 곳만 SSR 비용이 발생한다.
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies,
) {
  return createSSRServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").filter(
            (c): c is { name: string; value: string } => c.value !== undefined,
          );
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
