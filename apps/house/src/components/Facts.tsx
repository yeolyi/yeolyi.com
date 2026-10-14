import type { Notice } from "@shared/types.ts";
import { isMainRound } from "@shared/site.ts";
import { Fragment } from "react";
import { Term } from "./Term.tsx";

// 공고의 성격을 한 줄로: "경기 · 공공 일반형 · 본청약 · 투기과열지구". 낱말마다 풀이를 단다.
const TIP: Record<string, string> = {
	민영: "건설사가 짓는다. 소득 기준은 특별공급에만 있다. 신혼 특공은 소득 160%까지 일반 구간, 30%는 추첨이다.",
	"공공 일반형": "LH·SH·GH 등 공공이 짓는다. 자산은 부동산 2억 1,550만·자동차 4,542만 원 이하만 본다(2026).",
	"공공 나눔형": "법에선 이익공유형 분양주택. 팔 때 공공이 다시 사들이고 이익이나 손해를 나눈다. 총자산(전세보증금 포함) 3.62억 이하만.",
	"공공 토지임대부": "땅은 사업자가 갖고 집(건물)만 분양한다. 총자산(전세보증금 포함) 3.62억 이하만.",
	"공공 선택형": "법에선 임대의무기간이 6년인 분양전환공공임대주택. 6년 살고 분양받을지 고른다. 총자산 3.62억 이하만.",
	신혼희망타운: "신혼부부·예비신혼부부·한부모 가족만 넣는 공공분양. 총자산 3.62억 이하만.",
	본청약: "특공·1순위·2순위 순서로 접수하는 정식 공급. 통장과 자격 심사가 있다.",
	"잔여세대(무순위)": "본청약 부적격·계약 포기분을 다시 파는 것. 통장·순위 없이 추첨. 규제지역은 거주 요건과 재당첨 제한이 붙을 수 있다.",
	임의공급: "무순위 뒤에도 남은 것을 사업주체가 임의로 판다. 접수 순이든 자체 추첨이든 공고문이 정한다.",
	투기과열지구: "통장 2년·세대주여야 1순위. 당첨되면 10년 재당첨 제한. LTV 40%(생애최초 70%), 대출 상한 6억.",
	분양가상한제: "분양가를 정해진 상한 안에서만 받는다. 전매 제한과 실거주 의무가 따라온다.",
};

export function facts(n: Notice): string[] {
	const sector = n.kind === "신혼희망타운" ? "신혼희망타운" : n.publicHousing ? `공공 ${n.publicType ?? "일반형"}` : "민영";
	const round = isMainRound(n) ? "본청약" : n.kind === "임의공급" ? "임의공급" : "잔여세대(무순위)";
	return [sector, round, n.regulated && "투기과열지구", n.priceCap && "분양가상한제"].filter((x): x is string => !!x);
}

export function Facts({ n }: { n: Notice }) {
	return (
		<p className="text-muted-foreground">
			{n.sido}
			{facts(n).map((f) => (
				<Fragment key={f}>
					{" · "}
					<Term tip={TIP[f] ?? f}>{f}</Term>
				</Fragment>
			))}
		</p>
	);
}
