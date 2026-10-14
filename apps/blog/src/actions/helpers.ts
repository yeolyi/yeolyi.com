import { ActionError } from "astro:actions";
import type { AstroCookies } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// 인증 필요한 액션의 진입 가드. 서버에서 세션을 검증(getUser)해 안전하게 user 를
// 도출한다 — 클라이언트가 넘긴 값이 아니라 쿠키 세션 기준.
export async function requireAuth(request: Request, cookies: AstroCookies) {
  const supabase = createSupabaseServerClient(request, cookies);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return { user, supabase };
}
