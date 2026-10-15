import { useEffect, useState } from "react";

export const fmtClock = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// 주소: /(소개) · /notices?status=rejected · /notices/<id> · /settings · /settings/<질문> · /guide/<쪽>. 모노레포 전체에서 # 라우팅은 쓰지 않는다.
// 탭 같은 화면 상태는 쿼리에 두어 새로고침·공유해도 그대로 열리게 한다(서버는 vercel.json 이 모두 index.html 로).
// 같은 앱 안 링크(<a href="/…">)는 문서 단위로 가로채 history 로 옮긴다(다시 불러오지 않게).
export type Route = { segs: string[]; query: URLSearchParams };
const read = (): Route => ({
  segs: location.pathname.replace(/^\/+/, "").split("/"),
  query: new URLSearchParams(location.search),
});
const CHANGE = "house:navigate";
export function useRoute(): Route {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (
        !a ||
        a.origin !== location.origin ||
        a.target ||
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.button !== 0
      )
        return;
      e.preventDefault();
      navigate(a.pathname + a.search);
    };
    addEventListener("popstate", on);
    addEventListener(CHANGE, on);
    document.addEventListener("click", click);
    return () => {
      removeEventListener("popstate", on);
      removeEventListener(CHANGE, on);
      document.removeEventListener("click", click);
    };
  }, []);
  return route;
}
const navigate = (url: string) => {
  history.pushState(null, "", url);
  dispatchEvent(new Event(CHANGE));
  window.scrollTo(0, 0);
};
export const go = (path: string, query?: Record<string, string>) => {
  const q = new URLSearchParams(query).toString();
  navigate(`/${path}${q ? `?${q}` : ""}`);
};

/** lucide 아이콘 공통 크기(디자인 시스템: 1.25em, 선 굵기 2). */
export const ic = { size: "1.25em", "aria-hidden": true } as const;
