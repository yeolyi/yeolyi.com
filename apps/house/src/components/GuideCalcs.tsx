import { fmtYears, todayYmd, yearsBetween } from "@shared/dates.ts";
import { homelessStart, pointsOf } from "@shared/rules.ts";
import DateInput, { isRealDate } from "@yeolyi/ui/DateInput";
import Slider from "@yeolyi/ui/Slider";
import { type ReactNode, useId, useState } from "react";
import { useSettings } from "../data.ts";

// 가이드에 끼우는 계산기. 숫자를 옮겨 보며 규칙을 익힌다. 계산은 판정과 같은 함수(@shared)를 쓴다.

export function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="mt-[0.5rlh] first:mt-0">
      <div className="flex justify-between gap-4">
        <span id={id}>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="mt-1">{children(id)}</div>
    </div>
  );
}

export const Box = ({ children }: { children: ReactNode }) => (
  <div className="mt-[1rlh] border p-4">{children}</div>
);

// 통장 슬라이더 칸: 0 = 6개월 미만, 1 = 1년 미만, k = (k-1)년.
const accountLabel = (k: number) =>
  k === 0
    ? "6개월 미만"
    : k === 1
      ? "1년 미만"
      : k === 16
        ? "15년 이상"
        : `${k - 1}년`;
const accountYears = (k: number) => (k === 0 ? 0 : k === 1 ? 0.5 : k - 1);

// 무주택 기간은 날짜로 센다. 개인화에 넣은 생년월일·혼인신고일이 있으면 처음 값으로 쓰고, 고치면 이 화면에서만 바뀐다.
function DateField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    // 날짜 칸 사이는 1줄 띄우고, 한 칸 안(라벨·설명·입력)은 DS 입력 꼴처럼 좁게 붙인다.
    <div className="mt-[1rlh] flex flex-col">
      <label htmlFor={id} className="leading-[1.4]">
        {label}
      </label>
      {hint && (
        <p className="text-muted-foreground text-base leading-[1.4]">{hint}</p>
      )}
      <DateInput
        id={id}
        className="mt-1"
        value={value}
        onChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

export function PointsCalc() {
  const s = useSettings().data;
  const [birth, setBirth] = useState<string>();
  const [married, setMarried] = useState<string>();
  const [since, setSince] = useState("");
  const [d, setD] = useState(1);
  const [a, setA] = useState(4);
  const birthV = birth ?? s?.people[0]?.birth ?? "";
  const marriedV = married ?? s?.marriedAt ?? "";
  const today = todayYmd();
  const start = isRealDate(birthV)
    ? homelessStart({
        birth: birthV,
        marriedAt: isRealDate(marriedV) ? marriedV : undefined,
        homelessSince: isRealDate(since) ? since : undefined,
      })
    : undefined;
  const years = start ? Math.max(0, yearsBetween(start.date, today)) : 0;
  const p = pointsOf({
    homelessYears: years,
    dependents: d,
    accountYears: accountYears(a),
  });
  return (
    <Box>
      <div className="flex justify-between gap-4">
        <span>무주택 기간</span>
        <span className="font-mono">
          {start && start.date <= today ? `${fmtYears(years)} · ` : ""}
          {p.homeless}점
        </span>
      </div>
      {/* 세 날짜 칸을 다 보고 정한 결과라 칸들 아래가 아니라 제목 줄 바로 밑에 둔다. */}
      <p className="text-muted-foreground text-base">
        {!start
          ? "생년월일을 넣으면 계산합니다."
          : start.date > today
            ? `아직 세지 않습니다. ${start.date}(${start.from})부터 셉니다.`
            : `${start.date}(${start.from})부터 셉니다.`}
      </p>
      <DateField label="생년월일" value={birthV} onChange={setBirth} />
      <DateField
        label="혼인신고일"
        hint="안 했으면 비워 두세요."
        value={marriedV}
        onChange={setMarried}
      />
      <DateField
        label="마지막으로 무주택자가 된 날"
        hint="부부 중 누구든 집을 가졌다가 판 적이 있을 때만."
        value={since}
        onChange={setSince}
      />
      <div className="mt-[1rlh] border-t pt-[0.5rlh]" />
      <Row
        label="부양가족"
        value={`${d === 6 ? "6명 이상" : `${d}명`} · ${p.dependents}점`}
      >
        {(id) => (
          <Slider
            value={d}
            onValueChange={setD}
            min={0}
            max={6}
            aria-labelledby={id}
          />
        )}
      </Row>
      <Row label="통장 가입 기간" value={`${accountLabel(a)} · ${p.account}점`}>
        {(id) => (
          <Slider
            value={a}
            onValueChange={setA}
            min={0}
            max={16}
            aria-labelledby={id}
          />
        )}
      </Row>
      <p className="mt-[1rlh] border-t pt-[0.5rlh]">
        <span className="font-mono text-[1.5rem] font-bold">{p.total}</span> /
        84점
      </p>
    </Box>
  );
}

// 대출 규제는 자주 바뀌어 판정에 넣지 않는다. 여기서만 LTV·상한을 옮겨 보며 감을 잡는다. 계약금 비율은 공고문마다 다르다.
const DEPOSIT_PCT = 10;
export function MoneyCalc() {
  const [price, setPrice] = useState(8);
  const [ltv, setLtv] = useState(70);
  const [cap, setCap] = useState(6);
  const loanEok = Math.min((price * ltv) / 100, cap);
  const neededEquityEok = price - loanEok;
  const deposit = (price * DEPOSIT_PCT) / 100;
  const eok = (v: number) => `${Math.round(v * 10) / 10}억`;
  return (
    <Box>
      <Row label="분양가" value={eok(price)}>
        {(id) => (
          <Slider
            value={price}
            onValueChange={setPrice}
            min={3}
            max={20}
            step={0.5}
            aria-labelledby={id}
          />
        )}
      </Row>
      <Row label="LTV" value={`${ltv}%`}>
        {(id) => (
          <Slider
            value={ltv}
            onValueChange={setLtv}
            min={0}
            max={80}
            step={10}
            aria-labelledby={id}
          />
        )}
      </Row>
      <Row label="대출 상한" value={eok(cap)}>
        {(id) => (
          <Slider
            value={cap}
            onValueChange={setCap}
            min={1}
            max={15}
            aria-labelledby={id}
          />
        )}
      </Row>
      {/* 분양가 = 대출 + 필요한 내 돈. 칸 너비가 비율이라 상한(6억)에 걸리면 내 돈 칸이 커지는 게 보인다. */}
      <div className="mt-[1rlh] flex h-8 gap-[2px]" aria-hidden>
        <div
          className="bg-muted-foreground text-background flex items-center justify-center font-mono text-base tabular-nums"
          style={{ flex: `${loanEok} 1 0` }}
        >
          대출
        </div>
        <div
          className="bg-foreground text-background flex items-center justify-center font-mono text-base tabular-nums"
          style={{ flex: `${neededEquityEok} 1 0` }}
        >
          내 돈
        </div>
      </div>
      <dl className="mt-[0.5rlh] grid grid-cols-[1fr_auto] gap-x-4 border-t pt-[0.5rlh]">
        <dt>
          받을 수 있는 대출{" "}
          <span className="text-muted-foreground text-base">
            (LTV {ltv}%, 상한 {eok(cap)} 중 작은 쪽)
          </span>
        </dt>
        <dd className="text-right font-mono">{eok(loanEok)}</dd>
        <dt className="font-bold">필요한 내 돈</dt>
        <dd className="text-right font-mono font-bold">
          {eok(neededEquityEok)}
        </dd>
        <dt>
          그중 계약금{" "}
          <span className="text-muted-foreground text-base">
            ({DEPOSIT_PCT}%로 가정, 당장 현금)
          </span>
        </dt>
        <dd className="text-right font-mono">{eok(deposit)}</dd>
      </dl>
    </Box>
  );
}
