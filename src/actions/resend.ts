import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const AUDIENCE_ID = import.meta.env.RESEND_AUDIENCE_ID!;

export const subscribeEmail = defineAction({
  input: z.object({
    email: z.string().email(),
  }),
  handler: async (input) => {
    const resp = await resend.contacts.create({
      email: input.email,
      audienceId: AUDIENCE_ID,
    });
    if (resp.error) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: resp.error.message,
      });
    }

    return { success: true };
  },
});

// 구독자 수 조회 함수
export const getResendSubscriberCount = defineAction({
  handler: async () => {
    const response = await resend.contacts.list({ audienceId: AUDIENCE_ID });
    return response.data?.data.length || 0;
  },
});
