import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const AUDIENCE_ID = import.meta.env.RESEND_AUDIENCE_ID ?? "";

export const subscriber = {
  subscribe: defineAction({
    input: z.object({ email: z.email() }),
    handler: async ({ email }) => {
      const resp = await resend.contacts.create({
        email,
        audienceId: AUDIENCE_ID,
      });
      if (resp.error)
        throw new ActionError({
          code: "BAD_REQUEST",
          message: resp.error.message,
        });
      return { success: true };
    },
  }),

  getCount: defineAction({
    handler: async () => {
      // list 는 수신 거부(unsubscribed)한 연락처도 포함하므로 걸러서 센다.
      const resp = await resend.contacts.list({ audienceId: AUDIENCE_ID });
      return resp.data?.data.filter((c) => !c.unsubscribed).length ?? 0;
    },
  }),
};
