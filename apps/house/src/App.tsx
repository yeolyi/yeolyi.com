import PhaseBanner from "@yeolyi/ui/PhaseBanner";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { useEffect } from "react";
import { StatusBar } from "./components/StatusBar.tsx";
import { useSettings } from "./data.ts";
import { useRoute } from "./util.ts";
import { Feedback } from "./views/Feedback.tsx";
import { Guide } from "./views/Guide.tsx";
import { NoticeDetail } from "./views/NoticeDetail.tsx";
import { Notices } from "./views/Notices.tsx";
import { SettingsView } from "./views/Settings.tsx";

const NAV = [
  { key: "notices", label: "공고", href: "/" },
  { key: "guide", label: "가이드", href: "/guide" },
  { key: "settings", label: "개인화", href: "/settings" },
] as const;

// 서비스 헤더(yeolyi.com / 청약 알리미) 아래 45rem 한 단. 수집 상태는 맨 아래 한 줄.
export function App() {
  const {
    segs: [view = "notices", id],
    query,
  } = useRoute();
  const settings = useSettings();
  // 공고 목록이 첫 화면(/). 예전 주소 /notices 는 / 로 옮긴다(공고 상세는 /notices/<id> 그대로).
  const tab =
    view === "settings" || view === "guide" || view === "feedback"
      ? view
      : "notices";
  useEffect(() => {
    if (view === "notices" && !id)
      history.replaceState(null, "", `/${location.search}`);
  }, [view, id]);
  return (
    <>
      <ServiceHeader
        name="청약 알리미"
        href="/"
        className="measure-col pt-[1.5rlh]"
        nav={NAV.map((n) => ({
          label: n.label,
          href: n.href,
          current: tab === n.key,
        }))}
      />
      {/* 베타 동안 모든 화면에. 의견 화면에는 보던 주소를 넘긴다(의견 화면 자신에선 원래 주소를 그대로). */}
      <PhaseBanner
        className="measure-col mt-[0.5rlh]"
        feedbackHref={
          tab === "feedback"
            ? `/feedback${location.search}`
            : `/feedback?from=${encodeURIComponent(location.pathname + location.search)}`
        }
      />
      <main className="measure-col pt-[2rlh] pb-[3rlh]">
        {tab === "guide" ? (
          <Guide slug={id} />
        ) : tab === "feedback" ? (
          <Feedback from={query.get("from") ?? ""} />
        ) : !settings.data ? (
          <p className="meta">
            {settings.error
              ? `개인화 정보를 못 읽음: ${settings.error.message}`
              : "불러오는 중"}
          </p>
        ) : tab === "settings" ? (
          <SettingsView settings={settings.data} stepId={id} query={query} />
        ) : id ? (
          <NoticeDetail id={decodeURIComponent(id)} s={settings.data} />
        ) : (
          <Notices query={query} s={settings.data} />
        )}
      </main>
      <footer className="measure-col pb-[2rlh]">
        <StatusBar />
      </footer>
    </>
  );
}
