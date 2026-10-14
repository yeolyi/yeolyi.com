import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GitHub OAuth 로그인. 세션은 @supabase/ssr 이 쿠키로 관리하므로 서버가 읽을 수
// 있다 — 보호 라우트의 서버측 인가에 쓰인다.
export const auth = {
  login: defineAction({
    input: z.object({ redirectTo: z.string() }),
    handler: async ({ redirectTo }, { cookies, request }) => {
      const supabase = createSupabaseServerClient(request, cookies);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });
      if (error) {
        throw new ActionError({ code: "BAD_REQUEST", message: error.message });
      }
      return { url: data.url };
    },
  }),

  logout: defineAction({
    handler: async (_, { cookies, request }) => {
      const supabase = createSupabaseServerClient(request, cookies);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return { success: true };
    },
  }),
};
