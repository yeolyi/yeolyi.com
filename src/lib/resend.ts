import { Resend } from "resend";

// Resend 객체 생성
const resend = new Resend(import.meta.env.RESEND_API_KEY);

// 오디언스 ID 설정 (Resend 대시보드에서 생성한 ID)
const AUDIENCE_ID = import.meta.env.RESEND_AUDIENCE_ID!;

export const subscribeEmail = async (email: string) => {
  const resp = await resend.contacts.create({
    email,
    audienceId: AUDIENCE_ID,
  });
  if (resp.error) {
    throw new Error(resp.error.message);
  }
};

// 구독자 수 조회 함수
export const getSubscriberCount = async () => {
  const response = await resend.contacts.list({ audienceId: AUDIENCE_ID });
  return response.data?.data.length;
};
