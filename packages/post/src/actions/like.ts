import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { createServerClient } from "../supabase";

// 게시물 좋아요(하트) — 로그인 없이 tempUserId(localStorage UUID)로 사용자를
// 구분한다. DB RPC(add/remove/get_post_like)를 그대로 쓴다(스키마 변경 없음).
// 공개 엔드포인트라 임의 문자열로 행이 무한 생성되지 않게 길이를 제한한다.
const likeInput = z.object({
  postId: z.string().max(200),
  tempUserId: z.string().max(100).optional(),
});

export const like = {
  addThumbsUp: defineAction({
    input: likeInput,
    handler: async ({ postId, tempUserId }) => {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc("add_post_like", {
        p_post_id: postId,
        p_user_id: tempUserId || "anonymous",
      });
      if (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return { success: true, data };
    },
  }),

  removeThumbsUp: defineAction({
    input: likeInput,
    handler: async ({ postId, tempUserId }) => {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc("remove_post_like", {
        p_post_id: postId,
        p_user_id: tempUserId || "anonymous",
      });
      if (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return { success: true, data };
    },
  }),

  getLikeInfo: defineAction({
    input: likeInput,
    handler: async ({ postId, tempUserId }) => {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc("get_post_like_info", {
        p_post_id: postId,
        p_user_id: tempUserId || "anonymous",
      });
      if (error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      const row = data?.[0];
      return {
        count: Number(row?.count ?? 0),
        userLiked: row?.user_liked ?? false,
      };
    },
  }),
};
