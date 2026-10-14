import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { StatusBar } from "./components/StatusBar.tsx";
import { useSettings } from "./data.ts";
import { useRoute } from "./util.ts";
import { Guide } from "./views/Guide.tsx";
import { Home } from "./views/Home.tsx";
import { NoticeDetail } from "./views/NoticeDetail.tsx";
import { Notices } from "./views/Notices.tsx";
import { SettingsView } from "./views/Settings.tsx";

const NAV = [
	{ key: "notices", label: "공고" },
	{ key: "guide", label: "가이드" },
	{ key: "settings", label: "개인화" },
] as const;

// 서비스 헤더(yeolyi.com / 청약 알리미) 아래 45rem 한 단. 수집 상태는 맨 아래 한 줄.
export function App() {
	const {
		segs: [view = "notices", id],
		query,
	} = useRoute();
	const settings = useSettings();
	// / 는 소개(Home), 공고 목록은 /notices. 소개에서는 메뉴의 어느 칸도 고른 것으로 보이지 않는다.
	const home = view === "" || view === undefined;
	const tab = home ? undefined : view === "settings" || view === "guide" ? view : "notices";
	return (
		<>
			<ServiceHeader
				name="청약 알리미"
				href="/"
				className="measure-col pt-[1.5lh]"
				nav={NAV.map((n) => ({ label: n.label, href: `/${n.key}`, current: tab === n.key }))}
			/>
			<main className="measure-col pt-[2lh] pb-[3lh]">
				{home ? (
					<Home settings={settings.data} />
				) : tab === "guide" ? (
					<Guide slug={id} />
				) : !settings.data ? (
					<p className="meta">{settings.error ? `개인화 정보를 못 읽음: ${settings.error.message}` : "불러오는 중"}</p>
				) : tab === "settings" ? (
					<SettingsView settings={settings.data} stepId={id} query={query} />
				) : id ? (
					<NoticeDetail id={decodeURIComponent(id)} s={settings.data} />
				) : (
					<Notices query={query} s={settings.data} />
				)}
			</main>
			<footer className="measure-col pb-[2lh]">
				<StatusBar />
			</footer>
		</>
	);
}
