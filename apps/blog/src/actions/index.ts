import { like, pageView } from "@yeolyi/post/actions";
import { auth } from "./auth";
import { training } from "./training";

export const server = {
  auth,
  like,
  pageView,
  training,
};
