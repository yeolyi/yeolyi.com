import { pointsOf } from "@shared/rules.ts";
import { DEFAULT_SETTINGS } from "@shared/types.ts";
import { neededEquity } from "@shared/verdict.ts";
import Slider from "@yeolyi/ui/Slider";
import { type ReactNode, useId, useState } from "react";

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

// 슬라이더 칸: 무주택 0 = 아직 안 셈, 1 = 1년 미만, k = (k-1)년. 통장 0 = 6개월 미만, 1 = 1년 미만, k = (k-1)년.
const homelessLabel = (k: number) =>
  k === 0
    ? "아직 안 셈"
    : k === 1
      ? "1년 미만"
      : k === 16
        ? "15년 이상"
        : `${k - 1}년`;
const accountLabel = (k: number) =>
  k === 0
    ? "6개월 미만"
    : k === 1
      ? "1년 미만"
      : k === 16
        ? "15년 이상"
        : `${k - 1}년`;
const homelessYears = (k: number) => (k === 0 ? 0 : k === 1 ? 0.5 : k - 1);
const accountYears = (k: number) => (k === 0 ? 0 : k === 1 ? 0.5 : k - 1);

export function PointsCalc() {
  const [h, setH] = useState(1);
  const [d, setD] = useState(1);
  const [a, setA] = useState(4);
  const p = pointsOf({
    homelessYears: homelessYears(h),
    dependents: d,
    accountYears: accountYears(a),
  });
  return (
    <Box>
      <Row label="무주택 기간" value={`${homelessLabel(h)} · ${p.homeless}점`}>
        {(id) => (
          <Slider
            value={h}
            onValueChange={setH}
            min={0}
            max={16}
            aria-labelledby={id}
          />
        )}
      </Row>
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

export function MoneyCalc() {
  const [price, setPrice] = useState(8);
  const s = DEFAULT_SETTINGS;
  const { loanEok, neededEquityEok } = neededEquity(price, s);
  const deposit = Math.round(price * s.depositPct) / 100;
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
            (LTV {s.ltvPct}%, 상한 {s.loanCapEok}억 중 작은 쪽)
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
            ({s.depositPct}%, 당장 현금)
          </span>
        </dt>
        <dd className="text-right font-mono">{eok(deposit)}</dd>
      </dl>
    </Box>
  );
}
