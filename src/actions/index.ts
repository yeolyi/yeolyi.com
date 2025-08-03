import { getResendSubscriberCount, subscribeEmail } from "./resend";
import { getInstagramFollowers } from "./instagram";

export const server = {
  getInstagramFollowers,
  getResendSubscriberCount,
  subscribeEmail,
};
