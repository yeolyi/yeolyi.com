import type { Settings } from "@shared/types.ts";
import Button from "@yeolyi/ui/Button";
import { go } from "../util.ts";
import { isFresh } from "./Settings.tsx";

// 첫 화면(/): 한 줄 소개와 어디에 무엇이 있는지만. 공고 목록은 /notices 에 따로 있다.
// 아직 개인화하지 않았으면 주황 "개인화하기" 하나. 넣었으면 버튼 없이 아래 링크로 간다.
const PLACES = [
	{ href: "/notices", label: "공고", what: "매시간 모은 전국 청약 공고" },
	{ href: "/guide", label: "가이드", what: "청약을 처음 본다면" },
	{ href: "/settings", label: "개인화", what: "지역, 가구, 통장, 돈" },
];

export function Home({ settings }: { settings?: Settings }) {
	const fresh = !settings || isFresh(settings);
	return (
		<>
			<h1>청약 알리미</h1>
			<p className="mt-[0.5lh]">내 상황에 맞춰 넣을 수 있는 청약 공고를 골라 줍니다.</p>
			{fresh && (
				<div className="mt-[1lh]">
					<Button variant="primary" onClick={() => go("settings")}>
						개인화하기
					</Button>
				</div>
			)}
			<ul className="mt-[2lh] space-y-[0.25lh]">
				{PLACES.map((p) => (
					<li key={p.href}>
						<a href={p.href}>{p.label}</a> <span className="text-muted-foreground">{p.what}</span>
					</li>
				))}
			</ul>
		</>
	);
}
