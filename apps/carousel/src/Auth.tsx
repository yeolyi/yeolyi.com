// 로그인: GitHub·구글·카카오. 블로그와 같은 Supabase 인증을 쓰고, 누구나 가입해 자기 덱만 다룬다(RLS).
import type { Provider, Session } from "@supabase/supabase-js";
import Button from "@yeolyi/ui/Button";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "./supabase";

const PROVIDERS: [Provider, string][] = [
  ["kakao", "카카오"],
  ["google", "구글"],
  ["github", "GitHub"],
];

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // 토큰 갱신마다 다시 그리지 않는다.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="fatal">불러오는 중…</div>;
  if (session) return children;
  // 로그인 전에도 홈과 같은 서비스 헤더를 둔다. 할 일이 로그인 하나뿐이라 본문(제목 → 설명 → 버튼)은 남은 화면 한가운데.
  return (
    <div className="flex min-h-dvh flex-col">
      <ServiceHeader name="Carousel" className="border-b px-4 py-1" />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-[2rlh] text-center">
        <h1>Carousel</h1>
        <p className="mt-[0.5rlh]">인스타그램 캐러셀을 만드는 편집기입니다.</p>
        <div className="mt-[1rlh] grid w-[min(18rem,100%)] gap-2">
          {PROVIDERS.map(([provider, label]) => (
            <Button
              key={provider}
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider,
                  options: { redirectTo: location.href },
                })
              }
            >
              {label}로 로그인
            </Button>
          ))}
        </div>
      </main>
    </div>
  );
}

export const signOut = () => supabase.auth.signOut();
