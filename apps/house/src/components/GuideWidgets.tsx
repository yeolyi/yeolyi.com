import { NEWLYWED_TIERS } from "@shared/rules.ts";
import Checkbox from "@yeolyi/ui/Checkbox";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import Slider from "@yeolyi/ui/Slider";
import { clsx } from "clsx";
import { useState } from "react";
import { Box, Row } from "./GuideCalcs.tsx";

// 가이드의 쪽마다 하나씩 끼우는 만져 보는 부품. 숫자는 각 쪽에 단 조문 그대로다.
// 판정과 같은 규칙이 shared/rules.ts 에 있으면 그것을 쓰고, 설명에만 쓰는 표(예치금·입주금 비율)는 여기 둔다.

const man = (v: number) =>
  v >= 10000 ? `${v / 10000}억` : `${v.toLocaleString()}만`;
const Mark = ({ ok }: { ok: boolean }) => (
  <span
    className={clsx(
      "inline-block w-[2ch]",
      ok ? "font-bold" : "text-muted-foreground",
    )}
  >
    {ok ? "✓" : "✗"}
  </span>
);

/** 규칙 제27조(공공)·제28조(민영) 제1항의 1순위 요건. 위축지역과 시·도지사의 기간 연장은 빼고 기본값만 본다. */
type Area = "capital" | "regulated" | "other";
const AREA_LABEL: Record<Area, string> = {
  capital: "수도권",
  regulated: "규제지역",
  other: "수도권 밖",
};
const RANK1: Record<
  Area,
  { months: number; count: number; householder: boolean }
> = {
  capital: { months: 12, count: 12, householder: false },
  regulated: { months: 24, count: 24, householder: true },
  other: { months: 6, count: 6, householder: false },
};
export function Rank1Check() {
  const [area, setArea] = useState<Area>("capital");
  const [sector, setSector] = useState("민영");
  const [months, setMonths] = useState(18);
  const [count, setCount] = useState(18);
  const [deposit, setDeposit] = useState(true);
  const [householder, setHouseholder] = useState(false);
  const [noWin, setNoWin] = useState(true);
  const r = RANK1[area];
  const pub = sector === "공공";
  const checks = [
    { label: `통장 가입 ${r.months}개월 이상`, ok: months >= r.months },
    pub
      ? { label: `납입 ${r.count}회 이상`, ok: count >= r.count }
      : { label: "예치금 채움", ok: deposit },
    ...(r.householder
      ? [
          { label: "세대주", ok: householder },
          { label: "가구가 5년 안에 당첨된 적 없음", ok: noWin },
        ]
      : []),
  ];
  const rank1 = checks.every((c) => c.ok);
  return (
    <Box>
      <p>단지가 있는 곳</p>
      <div className="mt-1">
        <RadioGroup
          aria-label="단지가 있는 곳"
          options={(Object.keys(AREA_LABEL) as Area[]).map((a) => ({
            value: a,
            label: AREA_LABEL[a],
          }))}
          value={area}
          onValueChange={(v) => setArea(v as Area)}
        />
      </div>
      <p className="mt-[0.5rlh]">분양</p>
      <div className="mt-1">
        <RadioGroup
          aria-label="분양"
          options={["민영", "공공"]}
          value={sector}
          onValueChange={setSector}
        />
      </div>
      <div className="mt-[0.5rlh]">
        <Row label="통장 가입 기간" value={`${months}개월`}>
          {(id) => (
            <Slider
              value={[months]}
              onValueChange={([v]) => setMonths(v!)}
              min={0}
              max={36}
              aria-labelledby={id}
            />
          )}
        </Row>
        {pub && (
          <Row label="납입 횟수" value={`${count}회`}>
            {(id) => (
              <Slider
                value={[count]}
                onValueChange={([v]) => setCount(v!)}
                min={0}
                max={36}
                aria-labelledby={id}
              />
            )}
          </Row>
        )}
      </div>
      <div className="mt-[0.5rlh] flex flex-col items-start">
        {!pub && (
          <Checkbox checked={deposit} onCheckedChange={setDeposit}>
            예치금을 채웠다
          </Checkbox>
        )}
        {r.householder && (
          <>
            <Checkbox checked={householder} onCheckedChange={setHouseholder}>
              세대주다
            </Checkbox>
            <Checkbox checked={noWin} onCheckedChange={setNoWin}>
              가구가 5년 안에 당첨된 적이 없다
            </Checkbox>
          </>
        )}
      </div>
      <div className="mt-[1rlh] border-t pt-[0.5rlh]" aria-live="polite">
        <p className="font-bold">{rank1 ? "1순위입니다" : "2순위입니다"}</p>
        <ul className="mt-1">
          {checks.map((c) => (
            <li
              key={c.label}
              className={clsx(!c.ok && "text-muted-foreground")}
            >
              <Mark ok={c.ok} />
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </Box>
  );
}

/** 규칙 제10조 ②(선납은 24회분까지)·③(연체하면 회차별 납입인정일 = 약정납입일 + (연체총일수 − 선납총일수) ÷ 납입횟수).
 *  공고일 없이 "미리 내면 / 밀린 걸 내면"만 본다. 밀린 것은 가입 직후부터 연달아 밀렸고 오늘 한꺼번에 낸다고 가정한다(선납 없음). */
const DAYS_PER_MONTH = 365.25 / 12;
const span = (days: number) => {
  const months = Math.round(days / DAYS_PER_MONTH);
  return months >= 12
    ? `${Math.floor(months / 12)}년${months % 12 ? ` ${months % 12}개월` : ""}`
    : months >= 1
      ? `${months}개월`
      : `${Math.round(days)}일`;
};
export function PrepayCalc() {
  const [mode, setMode] = useState("prepay");
  const [monthly, setMonthly] = useState(10);
  const [lump, setLump] = useState(300);
  const [months, setMonths] = useState(60);
  const [missed, setMissed] = useState(24);
  const prepaid = Math.min(Math.floor(lump / monthly), 24);
  const wasted = Math.max(0, lump - 24 * monthly);
  const miss = Math.min(missed, months);
  // 가입 뒤 k번째 달(0부터) 회차를 months 달째인 오늘 내면 (months − k)달 늦은 것. 밀린 miss 회차의 연체일수를 더해 납입횟수(months)로 나눈다.
  const lateDays = DAYS_PER_MONTH * (miss * months - (miss * (miss - 1)) / 2);
  const shift = lateDays / months;
  return (
    <Box>
      <RadioGroup
        aria-label="경우"
        options={[
          { value: "prepay", label: "미리 내기" },
          { value: "late", label: "밀린 것 내기" },
        ]}
        value={mode}
        onValueChange={setMode}
      />
      <div className="mt-[0.5rlh]">
        {mode === "prepay" ? (
          <>
            <Row label="매달 내는 돈" value={`${monthly}만 원`}>
              {(id) => (
                <Slider
                  value={[monthly]}
                  onValueChange={([v]) => setMonthly(v!)}
                  min={2}
                  max={25}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <Row label="한 번에 넣는 목돈" value={`${man(lump)} 원`}>
              {(id) => (
                <Slider
                  value={[lump]}
                  onValueChange={([v]) => setLump(v!)}
                  min={0}
                  max={1500}
                  step={10}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <dl className="mt-[1rlh] grid grid-cols-[1fr_auto] gap-x-4 border-t pt-[0.5rlh]">
              <dt className="font-bold">선납으로 인정되는 회차</dt>
              <dd className="text-right font-mono font-bold">{prepaid}회</dd>
              <dt>선납으로 인정되지 않는 돈</dt>
              <dd className="text-right font-mono">{man(wasted)} 원</dd>
            </dl>
            <p className="text-muted-foreground mt-[0.5rlh]">
              {prepaid > 0
                ? `이 ${prepaid}회는 지금 한꺼번에 늘지 않고, 앞으로 ${prepaid}달 동안 한 회씩 인정됩니다.`
                : " "}
            </p>
          </>
        ) : (
          <>
            <Row label="가입한 지" value={span(months * DAYS_PER_MONTH)}>
              {(id) => (
                <Slider
                  value={[months]}
                  onValueChange={([v]) => setMonths(v!)}
                  min={1}
                  max={180}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <Row label="그중 밀린 회차" value={`${miss}회`}>
              {(id) => (
                <Slider
                  value={[miss]}
                  onValueChange={([v]) => setMissed(v!)}
                  min={0}
                  max={months}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <dl className="mt-[1rlh] grid grid-cols-[1fr_auto] gap-x-4 border-t pt-[0.5rlh]">
              <dt className="font-bold">회차마다 인정일이 밀리는 만큼</dt>
              <dd className="text-right font-mono font-bold">
                {miss ? span(shift) : "없음"}
              </dd>
            </dl>
            <p className="text-muted-foreground mt-[0.5rlh]">
              가입 직후부터 연달아 밀렸고 오늘 한꺼번에 낸다고 본 대략치입니다.
            </p>
          </>
        )}
      </div>
    </Box>
  );
}

/** 도시근로자 가구당 월평균소득(전년도) 100% 금액, 2026년 적용. LH 공공분양 안내(2026-09) 표 그대로(원).
 *  3인 이하는 한 칸(가구당 평균), 4인부터 가구원 수별. 비율은 이 가이드에 나오는 것만. */
const INCOME_BASE_2026: Record<string, number> = {
  "3인 이하": 7533763,
  "4인": 8802202,
  "5인": 9326985,
  "6인": 9906263,
  "7인": 10485541,
  "8인": 11064819,
};
const INCOME_PCTS = [100, 120, 130, 140, 160, 200];
export function IncomeTable() {
  const [size, setSize] = useState("3인 이하");
  const base = INCOME_BASE_2026[size]!;
  return (
    <Box>
      <p>가구원 수</p>
      <div className="mt-1">
        <RadioGroup
          aria-label="가구원 수"
          options={Object.keys(INCOME_BASE_2026).slice(0, 4)}
          value={size}
          onValueChange={setSize}
        />
      </div>
      <dl className="mt-[1rlh] grid grid-cols-[auto_1fr] gap-x-6 border-t pt-[0.5rlh]">
        {INCOME_PCTS.map((p) => (
          <div key={p} className="contents">
            <dt className="font-mono">{p}%</dt>
            <dd className="text-right font-mono">
              월 {Math.round((base * p) / 100 / 10000).toLocaleString()}만 원
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground mt-[0.5rlh]">
        2026년 적용 금액입니다. 7인 이상과 정확한 원 단위는 공고문에 있습니다.
      </p>
    </Box>
  );
}

/** 신혼부부 특공의 소득 구간을 소득 축 위에 그린다. 가로축은 도시근로자 월평균소득 대비 %(맞벌이 기준), 칸 안 숫자는 그 구간의 물량.
 *  민영 추첨 구간은 소득 상한이 없어 축 끝까지 칠하고 끝을 흐린다. 색은 줄 순서(우선 → 일반 → 추첨)를 잉크 → 보조 → 연한 회색으로, 범례를 함께 둔다.
 *  화면 읽기 프로그램에는 같은 내용을 표로 준다. */
const AXIS_MAX = 220;
const TIER_FILL = [
  "bg-foreground text-background",
  "bg-muted-foreground text-background",
  "bg-muted text-foreground",
];
type TierRow = {
  label: string;
  tiers: readonly { label: string; capPct?: number; sharePct: number }[];
};
const NEWLYWED_ROWS: TierRow[] = [
  { label: "민영", tiers: NEWLYWED_TIERS.private },
  { label: "공공", tiers: NEWLYWED_TIERS.public },
];
/** 생애최초(규칙 제43조 ③, 별표 6 2.다)·신생아(규칙 제35조의3 ③, 별표 6 2.마)의 줄. 맞벌이 기준 상한, 민영은 맞벌이 구분이 없다.
 *  마지막 줄은 "나머지"라 물량은 100에서 앞 줄을 뺀 값. 공공 마지막 줄 상한은 그 특공의 자격 상한(맞벌이 200%). */
export const FIRST_HOME_ROWS: TierRow[] = [
  {
    label: "민영",
    tiers: [
      { label: "우선", capPct: 130, sharePct: 50 },
      { label: "일반", capPct: 160, sharePct: 20 },
      { label: "추첨", sharePct: 30 },
    ],
  },
  {
    label: "공공",
    tiers: [
      { label: "우선", capPct: 120, sharePct: 70 },
      { label: "일반", capPct: 140, sharePct: 20 },
      { label: "추첨", capPct: 200, sharePct: 10 },
    ],
  },
];
export const NEWBORN_ROWS: TierRow[] = [
  {
    label: "민영",
    tiers: [
      { label: "우선", capPct: 130, sharePct: 50 },
      { label: "일반", capPct: 160, sharePct: 20 },
      { label: "추첨", sharePct: 30 },
    ],
  },
  {
    label: "공공",
    tiers: [
      { label: "우선", capPct: 120, sharePct: 70 },
      { label: "일반", capPct: 150, sharePct: 20 },
      { label: "추첨", capPct: 200, sharePct: 10 },
    ],
  },
];
export function TierChart({
  rows = NEWLYWED_ROWS,
  note,
}: {
  rows?: TierRow[];
  note?: string;
}) {
  const pct = (v: number) => `${(v / AXIS_MAX) * 100}%`;
  return (
    <figure className="mt-[0.5rlh]">
      <ul className="text-muted-foreground flex gap-4 text-base" aria-hidden>
        {rows[0]!.tiers.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            <span
              className={clsx(
                "inline-block size-3",
                TIER_FILL[i]!.split(" ")[0],
              )}
            />
            {t.label}
          </li>
        ))}
      </ul>
      {/* 눈금은 줄마다 그 구간의 경계에만(두 구간 경계를 한 축에 모으면 120·130·140 처럼 겹친다). */}
      <div
        className="mt-[0.5rlh] grid grid-cols-[3ch_1fr] gap-x-3 gap-y-1"
        aria-hidden
      >
        {rows.map((r) => {
          let low = 0;
          return (
            <div key={r.label} className="contents">
              <span className="self-center">{r.label}</span>
              <div className="relative h-8">
                {r.tiers.map((t, i) => {
                  // 상한이 없는 줄은 축 끝까지 한 칸으로 칠하고, 오른쪽을 흐리게 사라지게 해 계속 이어짐을 보인다.
                  const open = t.capPct === undefined;
                  const high = open ? AXIS_MAX : t.capPct!;
                  const seg = (
                    <div
                      key={t.label}
                      className={clsx(
                        "border-background absolute inset-y-0 flex items-center border-r-2 font-mono text-base tabular-nums",
                        open
                          ? "justify-start [mask-image:linear-gradient(to_right,black_55%,transparent)] pl-3"
                          : "justify-center",
                        TIER_FILL[i],
                      )}
                      style={{ left: pct(low), width: pct(high - low) }}
                      title={`${r.label} ${t.label}: 소득 ${open ? "무관" : `${t.capPct}% 이하`}, 물량 ${t.sharePct}%`}
                    >
                      {t.sharePct}%{open && " →"}
                    </div>
                  );
                  low = high;
                  return seg;
                })}
              </div>
              <span />
              <div className="text-muted-foreground relative mb-1 h-5 font-mono text-sm">
                {r.tiers
                  .filter((t) => t.capPct !== undefined)
                  .map((t) => (
                    <span
                      key={t.label}
                      className="absolute -translate-x-1/2"
                      style={{ left: pct(t.capPct!) }}
                    >
                      {t.capPct}
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="text-muted-foreground mt-[0.5rlh] text-base">
        막대 아래 숫자는 도시근로자 월평균소득 대비 %(맞벌이 기준)의 구간 경계,
        칸 안 숫자는 그 구간의 물량입니다. 민영 추첨 구간은 소득 상한이
        없습니다.{note && ` ${note}`}
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>소득 구간</caption>
          <thead>
            <tr>
              <th>분양</th>
              <th>구간</th>
              <th>소득</th>
              <th>물량</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((r) =>
              r.tiers.map((t) => (
                <tr key={r.label + t.label}>
                  <td>{r.label}</td>
                  <td>{t.label}</td>
                  <td>{t.capPct ? `${t.capPct}% 이하` : "소득 무관"}</td>
                  <td>{t.sharePct}%</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** 소득 구간의 사다리: 내 소득으로 처음 서는 줄부터, 떨어지면 다음 구간으로 내려가 다시 경쟁한다(규칙 제41조 ③, 공공주택 특별법 시행규칙 별표 6).
 *  소득이 낮을수록 기회가 여러 번이다. 공공은 마지막 줄 상한(맞벌이 200%)을 넘으면 넣을 수 없다. */
export function TierCascade() {
  const [sector, setSector] = useState("민영");
  const [income, setIncome] = useState(130);
  const tiers =
    sector === "민영" ? NEWLYWED_TIERS.private : NEWLYWED_TIERS.public;
  const enter = tiers.findIndex(
    (t) => t.capPct === undefined || income <= t.capPct,
  );
  return (
    <Box>
      <RadioGroup
        aria-label="분양"
        options={["민영", "공공"]}
        value={sector}
        onValueChange={setSector}
      />
      <div className="mt-[0.5rlh]">
        <Row
          label="가구 소득(맞벌이 기준)"
          value={`${income}%${income >= 250 ? "+" : ""}`}
        >
          {(id) => (
            <Slider
              value={[income]}
              onValueChange={([v]) => setIncome(v!)}
              min={50}
              max={250}
              step={5}
              aria-labelledby={id}
            />
          )}
        </Row>
      </div>
      <ol className="mt-[1rlh] border-t pt-[0.5rlh]" aria-live="polite">
        {tiers.map((t, i) => {
          const inLine = enter >= 0 && i >= enter;
          const step = inLine ? i - enter + 1 : undefined;
          return (
            <li
              key={t.label}
              className={clsx("flex gap-3", !inLine && "text-muted-foreground")}
            >
              <span className="w-[3ch] shrink-0 font-mono">
                {step ? `${step}.` : "–"}
              </span>
              <span>
                <span className={clsx(inLine && "font-bold")}>
                  {t.label} 구간
                </span>{" "}
                (물량 {t.sharePct}%,{" "}
                {t.capPct ? `${t.capPct}% 이하` : "소득 무관"})
                {inLine
                  ? step === 1
                    ? " 여기서 먼저 경쟁"
                    : " 앞에서 떨어지면 여기서 다시"
                  : " 소득이 넘어 못 들어감"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-[0.5rlh] font-bold">
        {enter < 0
          ? `${sector} 신혼부부 특별공급은 소득이 ${tiers.at(-1)!.capPct}%(맞벌이 기준)를 넘으면 넣을 수 없습니다.`
          : `기회는 ${tiers.length - enter}번입니다.`}
      </p>
    </Box>
  );
}

/** 같은 소득 구간 안에서 누가 먼저인가. 민영은 규칙 제41조 ②(자녀 → 해당지역 → 자녀 수 → 추첨),
 *  공공은 별표 6 2.나 3)·4)(자녀 있는 신혼부부·한부모가족 먼저, 우선 구간은 배점 13점 만점, 일반 구간은 추첨). */
const SCORE_ITEMS = [
  {
    label: "소득(맞벌이면 100% 이하)",
    options: ["80% 이하", "그 위"],
    points: [1, 0],
  },
  {
    label: "자녀",
    options: ["3명+", "2명", "1명", "없음"],
    points: [3, 2, 1, 0],
  },
  {
    label: "그 지역에 산 기간",
    options: ["3년+", "1~3년", "1년 미만"],
    points: [3, 2, 1],
  },
  {
    label: "납입 횟수",
    options: ["24회+", "12~23회", "6~11회"],
    points: [3, 2, 1],
  },
  {
    label: "혼인 기간",
    options: ["3년 이하", "3~5년", "5~7년"],
    points: [3, 2, 1],
  },
] as const;
const SCORE_MAX = SCORE_ITEMS.reduce((a, it) => a + Math.max(...it.points), 0);
const SCORE_ROW =
  "grid grid-cols-[1fr_max-content] gap-x-4 sm:grid-cols-[13rem_1fr_7ch]";
export function SameLineOrder() {
  const [sector, setSector] = useState("민영");
  const [picks, setPicks] = useState<number[]>(SCORE_ITEMS.map(() => 0));
  const steps =
    sector === "민영"
      ? [
          "자녀가 있는 부부가 먼저",
          "같으면 그 지역에 사는 사람",
          "그래도 같으면 자녀가 많은 사람",
          "그래도 같으면 추첨",
        ]
      : [
          "자녀가 있는 부부와 한부모가족이 먼저",
          "같으면 우선 구간은 점수 순, 일반 구간은 추첨",
          "점수까지 같으면 추첨",
        ];
  const score = SCORE_ITEMS.reduce((a, it, i) => a + it.points[picks[i]!]!, 0);
  return (
    <Box>
      <RadioGroup
        aria-label="분양"
        options={["민영", "공공"]}
        value={sector}
        onValueChange={setSector}
      />
      {/* 가이드 목차와 같은 꼴: 고정폭 번호 + 한 줄. 각 줄이 "같으면 …"으로 앞 줄을 이어받는다. */}
      <ol className="mt-[0.5rlh] space-y-[0.25rlh]">
        {steps.map((st, i) => (
          <li key={st} className="flex gap-3">
            <span className="text-muted-foreground w-[2ch] shrink-0 font-mono">
              {i + 1}
            </span>
            {st}
          </li>
        ))}
      </ol>
      {sector === "공공" && (
        // 영수증 꼴: 줄마다 항목 이름 | 고르는 칸 | 점수, 맨 아래 합계는 같은 점수 칸에. 좁은 화면은 "이름 … 점수" 아래 칸.
        <div className="mt-[1rlh] border-t pt-[1rlh]">
          <p className="font-bold">점수 매기기(신혼부부)</p>
          <div className="mt-[0.5rlh] space-y-[0.75rlh]">
            {SCORE_ITEMS.map((it, i) => (
              <div key={it.label} className={SCORE_ROW}>
                <span className="col-start-1 row-start-1 self-center">
                  {it.label}
                </span>
                <span className="col-start-2 row-start-1 self-center text-right font-mono tabular-nums sm:col-start-3">
                  {it.points[picks[i]!]}점
                </span>
                <div className="col-span-2 col-start-1 row-start-2 mt-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0">
                  <RadioGroup
                    aria-label={it.label}
                    options={it.options.map((o, j) => ({
                      value: String(j),
                      label: o,
                    }))}
                    value={String(picks[i])}
                    onValueChange={(v) =>
                      setPicks(picks.map((p, k) => (k === i ? Number(v) : p)))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <p
            className={clsx(
              SCORE_ROW,
              "mt-[0.75rlh] border-t pt-[0.5rlh] font-bold",
            )}
            aria-live="polite"
          >
            <span className="col-start-1 row-start-1">합계</span>
            <span className="col-start-2 row-start-1 text-right font-mono tabular-nums sm:col-start-3">
              {score} / {SCORE_MAX}점
            </span>
          </p>
        </div>
      )}
    </Box>
  );
}
