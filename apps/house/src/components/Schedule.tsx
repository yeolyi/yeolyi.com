import { fmtDate } from "@shared/dates.ts";
import { isMainRound } from "@shared/site.ts";
import type { Notice } from "@shared/types.ts";
import MonthCalendar from "@yeolyi/ui/MonthCalendar";
import { clsx } from "clsx";
import { Term } from "./Term.tsx";

export type Milestone = { label: string; date: string; end?: string; month?: boolean };

const TIP: Record<string, string> = {
	공고: "입주자모집공고. 단지 정보·분양가·특공 물량·자격이 전부 담긴 문서.",
	"특공 접수": "특별공급 접수일. 일반공급보다 먼저 받는다.",
	"1순위 접수": "일반공급 1순위 접수일. 규제지역은 통장 2년·세대주 조건.",
	"2순위 접수": "1순위에서 미달일 때만 의미가 있다.",
	접수: "무순위·임의공급 접수일. 순위 없이 추첨 또는 선착순.",
	"접수(첫날 특공)": "LH 공공 본청약. 청약홈엔 기간 하나로만 오지만 첫날이 특공, 그다음부터 1순위. 정확한 날은 공고문.",
	"당첨 발표": "이 날 청약홈에서 확인. 당첨되면 서류 심사(소득·자산·무주택) 뒤 계약.",
	계약: "계약금(분양가의 20% 안)을 낸다. 계약을 포기해도 당첨 이력은 남아 재당첨 제한이 걸린다.",
	입주: "입주 예정 월. 잔금을 여기서 낸다.",
};

export function milestones(n: Notice): Milestone[] {
	const out: Milestone[] = [{ label: "공고", date: n.announcedAt }];
	if (n.spStart) out.push({ label: "특공 접수", date: n.spStart, end: n.spEnd });
	// LH 공공 본청약은 청약홈에 특공 날짜가 비어 오고 접수 기간 하나만 온다. 그 첫날이 특공이다.
	const publicNoSpecial = isMainRound(n) && n.publicHousing && !n.spStart;
	if (n.r1Start) out.push({ label: publicNoSpecial ? "접수(첫날 특공)" : isMainRound(n) ? "1순위 접수" : "접수", date: n.r1Start, end: n.r1End });
	if (n.r2Start) out.push({ label: "2순위 접수", date: n.r2Start, end: n.r2End });
	if (n.winnerAt) out.push({ label: "당첨 발표", date: n.winnerAt });
	if (n.contractStart) out.push({ label: "계약", date: n.contractStart, end: n.contractEnd });
	if (n.moveInYm) out.push({ label: "입주", date: `${n.moveInYm.slice(0, 4)}-${n.moveInYm.slice(4, 6)}-01`, month: true });
	return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 다음에 올 일정. 목록의 날짜 칸에 쓴다. */
export function nextMilestone(n: Notice, today: string): Milestone | undefined {
	return milestones(n).find((m) => (m.end ?? m.date) >= today && m.label !== "공고");
}

export const fmtWhen = (m: Milestone) => (m.month ? m.date.slice(0, 7).replace("-", ".") : m.end && m.end !== m.date ? `${fmtDate(m.date)}~${fmtDate(m.end)}` : fmtDate(m.date));

// 달력 칸에 들어갈 짧은 이름. 풀이는 아래 목록의 Term 에 있다.
const SHORT: Record<string, string> = { "특공 접수": "특공", "1순위 접수": "1순위", "2순위 접수": "2순위", "접수(첫날 특공)": "접수", "당첨 발표": "발표" };

/** 공고~계약은 월 달력으로, 입주(몇 년 뒤라 달력에 안 들어간다)와 용어 풀이는 아래 날짜 목록으로. */
export function Schedule({ n, today }: { n: Notice; today: string }) {
	const ms = milestones(n);
	return (
		<>
			<MonthCalendar events={ms.filter((m) => !m.month).map((m) => ({ start: m.date, end: m.end, label: SHORT[m.label] ?? m.label }))} today={today} />
			<ScheduleList ms={ms} today={today} />
		</>
	);
}

/** 날짜 + 일. 지난 것은 보조 색, 오늘 걸린 것은 굵게. */
function ScheduleList({ ms, today }: { ms: Milestone[]; today: string }) {
	return (
		<ul className="mt-[1lh] grid grid-cols-[max-content_1fr] gap-x-4">
			{ms.map((m) => {
				const past = (m.end ?? m.date) < today;
				const now = m.date <= today && today <= (m.end ?? m.date);
				return (
					<li key={m.label} className={clsx("contents", past && "text-muted-foreground", now && "font-bold")}>
						<span className="font-mono">{fmtWhen(m)}</span>
						<span>
						<Term tip={TIP[m.label] ?? m.label}>{m.label}</Term>
						{now && " (오늘)"}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
