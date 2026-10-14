import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { requireAuth } from "./helpers";

// 로그 전용·컬럼형 구조 — training_sessions 한 테이블. 리프트의 "현재/다음" 무게·
// 스테이지는 클라이언트가 deriveState(로그)로 계산하고, 여기선 그날 실제로 한 결과를
// 그대로 저장한다(파생 상태 테이블 없음, jsonb 없음).

const stageEnum = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const dayTypeEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const SESSION_COLUMNS =
  "id, date, day_type, t1_weight, t1_stage, t1_success, t2_weight, t2_stage, t2_success, t3_weight, t3_hit25";

export const training = {
  // 최근 세션(내림차순).
  listSessions: defineAction({
    input: z
      .object({ limit: z.number().int().min(1).max(365).default(60) })
      .optional(),
    handler: async (input, { cookies, request }) => {
      const { user, supabase } = await requireAuth(request, cookies);
      const { data, error } = await supabase
        .from("training_sessions")
        .select(SESSION_COLUMNS)
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(input?.limit ?? 60);
      if (error)
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      return { sessions: data ?? [] };
    },
  }),

  // 하루 기록 저장(같은 날짜면 덮어쓰기).
  saveSession: defineAction({
    input: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식"),
      day_type: dayTypeEnum,
      t1_weight: z.number().positive(),
      t1_stage: stageEnum,
      t1_success: z.boolean(),
      t2_weight: z.number().positive(),
      t2_stage: stageEnum,
      t2_success: z.boolean(),
      t3_weight: z.number().positive(),
      t3_hit25: z.boolean(),
    }),
    handler: async (input, { cookies, request }) => {
      const { user, supabase } = await requireAuth(request, cookies);
      const { error } = await supabase
        .from("training_sessions")
        .upsert({ user_id: user.id, ...input }, { onConflict: "user_id,date" });
      if (error)
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      return { success: true };
    },
  }),
};
