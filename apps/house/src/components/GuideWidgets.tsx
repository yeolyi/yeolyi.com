import {
  type Earners,
  INCOME_BASE_2026,
  NEWLYWED_TIERS,
  type Tier,
} from "@shared/rules.ts";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import Slider from "@yeolyi/ui/Slider";
import { clsx } from "clsx";
import { useState } from "react";
import { Box, Row } from "./GuideCalcs.tsx";

// 가이드의 쪽마다 하나씩 끼우는 만져 보는 부품. 숫자는 각 쪽에 단 조문 그대로다.
// 판정과 같은 규칙이 shared/rules.ts 에 있으면 그것을 쓰고, 설명에만 쓰는 표(예치금·입주금 비율)는 여기 둔다.

const man = (v: number) =>
  v >= 10000 ? `${v / 10000}억` : `${v.toLocaleString()}만`;
/** 규칙 제10조 ②(선납은 24회분까지)·③(연체하면 회차별 납입인정일 = 약정납입일 + (연체총일수 − 선납총일수) ÷ 납입횟수).
 *  공고일 없이 "미리 내기 / 늦게 내기"만 본다. 밀린 것은 가입 직후부터 연달아 밀렸고 오늘 한꺼번에 낸다고 가정한다(선납 없음). */
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
          { value: "late", label: "늦게 내기" },
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
                  value={monthly}
                  onValueChange={setMonthly}
                  min={2}
                  max={25}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <Row label="한 번에 넣는 목돈" value={`${man(lump)} 원`}>
              {(id) => (
                <Slider
                  value={lump}
                  onValueChange={setLump}
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
                  value={months}
                  onValueChange={setMonths}
                  min={1}
                  max={180}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <Row label="그중 밀린 회차" value={`${miss}회`}>
              {(id) => (
                <Slider
                  value={miss}
                  onValueChange={setMissed}
                  min={0}
                  max={months}
                  aria-labelledby={id}
                />
              )}
            </Row>
            <dl className="mt-[1rlh] grid grid-cols-[1fr_auto] gap-x-4 border-t pt-[0.5rlh]">
              <dt className="font-bold">
                회차마다 낸 날로 쳐 주는 날이 늦어지는 기간
              </dt>
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

type HouseholdSize = keyof typeof INCOME_BASE_2026;
const INCOME_PCTS = [100, 120, 130, 140, 160, 200];
export function IncomeTable() {
  const [size, setSize] = useState<HouseholdSize>("3인 이하");
  const base = INCOME_BASE_2026[size];
  return (
    <Box>
      <p>가구원 수</p>
      <div className="mt-1">
        <RadioGroup
          aria-label="가구원 수"
          options={Object.keys(INCOME_BASE_2026).slice(0, 4)}
          value={size}
          onValueChange={(v) => setSize(v as HouseholdSize)}
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

/** 특공의 소득 구간을 소득 축 위에 그린다. 가로축은 도시근로자 월평균소득 대비 %, 칸 안 숫자는 그 구간의 물량.
 *  공공은 맞벌이와 외벌이의 경계가 달라 막대 하나에 둘을 담을 수 없으니 줄을 나눈다.
 *  민영 추첨 구간은 소득 상한이 없어 축 끝까지 칠하고 끝을 흐린다. 색은 줄 순서(우선 → 일반 → 추첨)를 잉크 → 보조 → 연한 회색으로, 범례를 함께 둔다.
 *  화면 읽기 프로그램에는 같은 내용을 표로 준다. */
const AXIS_MAX = 220;
const TIER_FILL = [
  "bg-foreground text-background",
  "bg-muted-foreground text-background",
  "bg-muted text-foreground",
];
type TierRow = { label: string } & Record<Earners, readonly Tier[]>;
// 숫자는 규칙 제35조의3·제41조·제43조(2026-06-15)와 별표 6(2026-06-22) 원문과 대조했다. 외벌이는 부부 중 한 명만 소득이 있는 가구(공공은 미혼 포함).
// 공공 외벌이는 자격 상한이 일반 구간 상한과 같아 추첨 칸이 없다. 추첨 몫엔 앞 구간에서 떨어진 사람으로 들어간다(별표 6 2.나 2)다)).
// 마지막 줄 물량은 100에서 앞 줄을 뺀 값.
// 차트에는 바로 들어갈 수 있는 구간만 그린다(공공 외벌이 추첨은 상한이 일반과 같아 폭이 없다).
const enterable = (tiers: readonly Tier[]) =>
  tiers.filter(
    (t, i) =>
      i === 0 || t.capPct === undefined || t.capPct !== tiers[i - 1]?.capPct,
  );
const NEWLYWED_ROWS: TierRow[] = [
  { label: "민영", ...NEWLYWED_TIERS.private },
  {
    label: "공공",
    맞벌이: NEWLYWED_TIERS.public.맞벌이,
    외벌이: enterable(NEWLYWED_TIERS.public.외벌이),
  },
];
/** 생애최초(규칙 제43조 ③, 별표 6 2.다)·신생아(규칙 제35조의3 ③, 별표 6 2.마). 민영은 맞벌이 구분이 없다. */
const PRIVATE_130_160: readonly Tier[] = [
  { label: "우선", capPct: 130, sharePct: 50 },
  { label: "일반", capPct: 160, sharePct: 20 },
  { label: "추첨", sharePct: 30 },
];
export const FIRST_HOME_ROWS: TierRow[] = [
  { label: "민영", 맞벌이: PRIVATE_130_160, 외벌이: PRIVATE_130_160 },
  {
    label: "공공",
    맞벌이: [
      { label: "우선", capPct: 120, sharePct: 70 },
      { label: "일반", capPct: 140, sharePct: 20 },
      { label: "추첨", capPct: 200, sharePct: 10 },
    ],
    외벌이: [
      { label: "우선", capPct: 100, sharePct: 70 },
      { label: "일반", capPct: 130, sharePct: 20 },
    ],
  },
];
export const NEWBORN_ROWS: TierRow[] = [
  { label: "민영", 맞벌이: PRIVATE_130_160, 외벌이: PRIVATE_130_160 },
  {
    label: "공공",
    맞벌이: [
      { label: "우선", capPct: 120, sharePct: 70 },
      { label: "일반", capPct: 150, sharePct: 20 },
      { label: "추첨", capPct: 200, sharePct: 10 },
    ],
    외벌이: [
      { label: "우선", capPct: 100, sharePct: 70 },
      { label: "일반", capPct: 140, sharePct: 20 },
    ],
  },
];
export function TierChart({ rows = NEWLYWED_ROWS }: { rows?: TierRow[] }) {
  const pct = (v: number) => `${(v / AXIS_MAX) * 100}%`;
  // 외벌이·맞벌이 경계가 같은 분양(민영 생애최초·신생아)은 한 줄로 둔다.
  const lines = rows.flatMap((r) =>
    r.외벌이 === r.맞벌이
      ? [{ label: r.label, tiers: r.맞벌이 }]
      : (["외벌이", "맞벌이"] as const).map((e) => ({
          label: `${r.label} ${e}`,
          tiers: r[e],
        })),
  );
  return (
    <figure className="mt-[0.5rlh]">
      <ul className="text-muted-foreground flex gap-4 text-base" aria-hidden>
        {rows[0]?.맞벌이.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            <span
              className={clsx(
                "inline-block size-3",
                TIER_FILL[i]?.split(" ")[0],
              )}
            />
            {t.label}
          </li>
        ))}
      </ul>
      {/* 눈금은 줄마다 그 구간의 경계에만(두 구간 경계를 한 축에 모으면 120·130·140 처럼 겹친다). */}
      <div
        className="mt-[0.5rlh] grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1"
        aria-hidden
      >
        {lines.map((r) => {
          let low = 0;
          return (
            <div key={r.label} className="contents">
              <span className="self-center">{r.label}</span>
              <div className="relative h-8">
                {r.tiers.map((t, i) => {
                  // 상한이 없는 줄은 축 끝까지 한 칸으로 칠하고, 오른쪽을 흐리게 사라지게 해 계속 이어짐을 보인다.
                  const open = t.capPct === undefined;
                  const high = t.capPct ?? AXIS_MAX;
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
                  .flatMap((t) =>
                    t.capPct === undefined ? [] : [{ ...t, capPct: t.capPct }],
                  )
                  .map((t) => (
                    <span
                      key={t.label}
                      className="absolute -translate-x-1/2"
                      style={{ left: pct(t.capPct) }}
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
        막대 아래 숫자는 도시근로자 월평균소득 대비 %의 구간 경계, 칸 안 숫자는
        그 구간의 물량입니다. 같은 분양의 외벌이·맞벌이 두 줄은 물량을 함께
        쓰고, 구간에 들어가는 소득만 다릅니다. 민영 추첨 구간은 소득 상한이
        없고, 공공 외벌이는 일반 구간 상한이 자격 상한이라 추첨 칸이 없습니다.
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
            {lines.flatMap((r) =>
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
  const [earners, setEarners] = useState<string>("맞벌이");
  const [income, setIncome] = useState(130);
  const tiers =
    NEWLYWED_TIERS[sector === "민영" ? "private" : "public"][
      earners as Earners
    ];
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
        <RadioGroup
          aria-label="소득이 있는 사람"
          options={["맞벌이", "외벌이"]}
          value={earners}
          onValueChange={setEarners}
        />
      </div>
      <div className="mt-[0.5rlh]">
        <Row label="가구 소득" value={`${income}%${income >= 250 ? "+" : ""}`}>
          {(id) => (
            <Slider
              value={income}
              onValueChange={setIncome}
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
          ? `${sector} 신혼부부 특별공급은 ${earners} 가구 소득이 ${tiers.at(-1)?.capPct}%를 넘으면 넣을 수 없습니다.`
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
    options: ["그 위", "80% 이하"],
    points: [0, 1],
  },
  {
    label: "자녀",
    options: ["없음", "1명", "2명", "3명+"],
    points: [0, 1, 2, 3],
  },
  {
    label: "그 지역에 산 기간",
    options: ["1년 미만", "1~3년", "3년+"],
    points: [1, 2, 3],
  },
  {
    label: "납입 횟수",
    options: ["6~11회", "12~23회", "24회+"],
    points: [1, 2, 3],
  },
  {
    label: "혼인 기간",
    options: ["5~7년", "3~5년", "3년 이하"],
    points: [1, 2, 3],
  },
] as const;
const SCORE_MAX = SCORE_ITEMS.reduce((a, it) => a + Math.max(...it.points), 0);
// 보기는 점수가 낮은 것부터라 오른쪽으로 갈수록 높다. 처음엔 첫 보기(최저점).
const pointOf = (it: (typeof SCORE_ITEMS)[number], pick: number | undefined) =>
  it.points[pick ?? 0] ?? 0;
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
  const score = SCORE_ITEMS.reduce((a, it, i) => a + pointOf(it, picks[i]), 0);
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
                  {pointOf(it, picks[i])}점
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
