import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { createServerClient } from "../supabase";

// 글 조회수 읽기. 기록은 @yeolyi/track 이 브라우저에서 바로 한다(analytics.page_views 를 같이 올린다).
export const pageView = {
  getCount: defineAction({
    input: z.object({
      site: z.string().max(20),
      path: z.string().max(300),
    }),
    handler: async ({ site, path }) => {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc("page_view_count", {
        p_site: site,
        p_path: path,
      });
      if (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return { viewCount: Number(data ?? 0) };
    },
  }),
};
