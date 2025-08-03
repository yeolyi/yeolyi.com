import type { Session } from "@supabase/supabase-js";
import { map, onMount } from "nanostores";
import supabase from "@/db";
import { loginToDB, logoutFromDB } from "@/db/auth";
import { getErrMessage } from "@/lib/utils";

// 세션 상태 스토어
export const $sessionStore = map<{
  session: Session | null;
  isLoading: boolean;
}>({
  session: null,
  isLoading: true,
});

// 로딩 상태 설정 함수
export function setLoading(isLoading: boolean) {
  $sessionStore.setKey("isLoading", isLoading);
}

// 로그인 함수
export async function login(): Promise<{
  success: boolean;
  error: string;
}> {
  try {
    setLoading(true);
    await loginToDB();
    return { success: true, error: "" };
  } catch (error) {
    return {
      success: false,
      error: getErrMessage(error),
    };
  }
}

// 로그아웃 함수
export async function logout(): Promise<{
  success: boolean;
  error: string;
}> {
  try {
    await logoutFromDB();
    $sessionStore.setKey("session", null);
    return { success: true, error: "" };
  } catch (error) {
    console.error("로그아웃 오류:", error);
    return {
      success: false,
      error: getErrMessage(error),
    };
  }
}

// 인증 상태 변경 감지를 위한 리스너 설정
// onMount를 사용해서 스토어가 활성화될 때 자동으로 초기화
onMount($sessionStore, () => {
  // 인증 상태 변경 감지
  // 이걸 써야 탭 간에 상태 동기화가 가능하다.
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    $sessionStore.setKey("session", session);
    setLoading(false);
  });

  // 구독 정리 함수 반환
  return () => {
    subscription.unsubscribe();
  };
});
