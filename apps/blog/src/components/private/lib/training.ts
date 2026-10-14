// GZCLP 훈련 로직. private.yeolyi.com에서 이식, 컬럼형 스키마로 재작성.
// 참고: https://thefitness.wiki/routines/gzclp/  (사용자는 kg 단위로 진행)
import { sortBy } from "es-toolkit";
//
// training_sessions(일별 로그, 평평한 컬럼)만 저장한다. 각 리프트의 "현재/다음"
// 무게·스테이지는 deriveState 로 로그에서 계산한다(파생 상태 테이블 없음).
// 각 티어의 리프트는 day_type 으로 결정된다(DAY_PLAN) — 로그엔 무게·스테이지·성패만.

export type Lift =
  | "squat"
  | "bench"
  | "deadlift"
  | "ohp"
  | "lat_pulldown"
  | "db_row";
export type Tier = "T1" | "T2" | "T3";
export type Stage = 1 | 2 | 3;
export type DayType = 1 | 2 | 3 | 4;

export const LIFT_LABEL: Record<Lift, string> = {
  squat: "스쿼트",
  bench: "벤치프레스",
  deadlift: "데드리프트",
  ohp: "오버헤드프레스",
  lat_pulldown: "랫풀다운",
  db_row: "덤벨로우",
};

// GZCLP 4일 순환. 각 날의 T1/T2/T3 리프트.
export const DAY_PLAN: Record<DayType, { t1: Lift; t2: Lift; t3: Lift }> = {
  1: { t1: "squat", t2: "bench", t3: "lat_pulldown" },
  2: { t1: "ohp", t2: "deadlift", t3: "db_row" },
  3: { t1: "bench", t2: "squat", t3: "lat_pulldown" },
  4: { t1: "deadlift", t2: "ohp", t3: "db_row" },
};

export const DAY_THEME: Record<DayType, string> = {
  1: "스쿼트 데이",
  2: "OHP 데이",
  3: "벤치 데이",
  4: "데드리프트 데이",
};

// 스테이지별 세트×렙 처방.
export const STAGE_SETS: Record<
  Tier,
  Record<Stage, { sets: number; reps: number; amrap: boolean }>
> = {
  T1: {
    1: { sets: 5, reps: 3, amrap: true },
    2: { sets: 6, reps: 2, amrap: true },
    3: { sets: 10, reps: 1, amrap: true },
  },
  T2: {
    1: { sets: 3, reps: 10, amrap: false },
    2: { sets: 3, reps: 8, amrap: false },
    3: { sets: 3, reps: 6, amrap: false },
  },
  T3: {
    1: { sets: 3, reps: 15, amrap: true },
    2: { sets: 3, reps: 15, amrap: true },
    3: { sets: 3, reps: 15, amrap: true },
  },
};

export const REST_BY_TIER: Record<Tier, string> = {
  T1: "3-5분",
  T2: "2-3분",
  T3: "1-1.5분",
};

// 리프트당 성공 시 증량폭(kg).
function increment(lift: Lift): number {
  if (lift === "lat_pulldown" || lift === "db_row") return 2.5;
  return 5;
}

const BAR_STEP = 5;
function snapWeight(w: number): number {
  return Math.round(w / BAR_STEP) * BAR_STEP;
}

// 랫풀다운 핀 스택 / 덤벨 랙(kg).
const LAT_PULLDOWN_STACK = [
  5, 10, 15, 20, 25, 32, 40, 47, 55, 62, 70, 78, 85, 92, 100,
] as const;
const DB_ROW_RACK = [
  5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
] as const;

function nextStackWeight(stack: readonly number[], current: number): number {
  for (const w of stack) if (w > current) return w;
  return stack[stack.length - 1];
}

// 그날 실제로 한 결과(진행 계산 입력).
interface T1Result {
  lift: Lift;
  weight: number;
  stage: Stage;
  success: boolean;
}
interface T2Result {
  lift: Lift;
  weight: number;
  stage: Stage;
  success: boolean;
}
interface T3Result {
  lift: Lift;
  weight: number;
  hit_25: boolean;
}

// 일별 세션 로그(training_sessions 행). 리프트는 day_type 에서 파생.
export interface TrainingSession {
  id: string;
  date: string;
  day_type: number;
  t1_weight: number;
  t1_stage: number;
  t1_success: boolean;
  t2_weight: number;
  t2_stage: number;
  t2_success: boolean;
  t3_weight: number;
  t3_hit25: boolean;
}

// 진행 결과(티어별 전용 유니온 — 분기 좁힘이 정확히 되도록 T1/T2 분리).
type T1Outcome =
  | { kind: "success"; nextWeight: number; stage: Stage }
  | { kind: "stage_up"; nextStage: Stage; weight: number }
  | { kind: "deload_t1_manual"; weight: number }; // 새 5RM 외부 측정 필요
type T2Outcome =
  | { kind: "success"; nextWeight: number; stage: Stage }
  | { kind: "stage_up"; nextStage: Stage; weight: number }
  | { kind: "deload_t2"; newWeight: number; nextStage: 1 };

function evalT1(result: T1Result): T1Outcome {
  if (result.success)
    return {
      kind: "success",
      nextWeight: snapWeight(result.weight + increment(result.lift)),
      stage: result.stage,
    };
  if (result.stage < 3)
    return {
      kind: "stage_up",
      nextStage: (result.stage + 1) as Stage,
      weight: result.weight,
    };
  return { kind: "deload_t1_manual", weight: result.weight };
}

function evalT2(
  result: T2Result,
  lastStage1WeightForLift: number | null,
): T2Outcome {
  if (result.success)
    return {
      kind: "success",
      nextWeight: snapWeight(result.weight + increment(result.lift)),
      stage: result.stage,
    };
  if (result.stage < 3)
    return {
      kind: "stage_up",
      nextStage: (result.stage + 1) as Stage,
      weight: result.weight,
    };
  // 스테이지 3 실패: 마지막 스테이지 1 무게 + 7.5kg 로 자동 디로드.
  const baseline = lastStage1WeightForLift ?? result.weight;
  return {
    kind: "deload_t2",
    newWeight: snapWeight(baseline + 7.5),
    nextStage: 1,
  };
}

function evalT3(result: T3Result): { nextWeight: number } {
  if (!result.hit_25) return { nextWeight: result.weight };
  if (result.lift === "lat_pulldown")
    return { nextWeight: nextStackWeight(LAT_PULLDOWN_STACK, result.weight) };
  if (result.lift === "db_row")
    return { nextWeight: nextStackWeight(DB_ROW_RACK, result.weight) };
  return { nextWeight: snapWeight(result.weight + increment(result.lift)) };
}

// 첫 진행 기본 시작 무게(kg). 2026-09 재시작 기준으로 갱신했다.
//
// 2026-04~06 의 17세션에서 T1 이 스쿼트 60·벤치 65·데드 85·OHP 40 까지 올라갔는데,
// 그 뒤 10주를 쉬었으므로 그 무게로 돌아가면 실패한다. 마지막 무게에서 약 20% 내렸다.
// 성공하면 세션마다 5kg 오르니 3~4세션(2주 남짓)이면 이전 무게를 지나친다 — 낮게
// 시작하는 비용은 작고, 높게 시작해 초반부터 실패하면 스테이지가 밀려 회복이 더 느리다.
//
// T3 는 더 크게 내렸다. 17세션 내내 덤벨로우 8kg 이 25렙을 한 번도 못 넘기고 랫풀다운
// 32kg 도 한 번만 넘겼다 — 넘기지 못하면 무게가 그대로라 진행이 멈춘다. 확실히 넘길
// 무게에서 시작해야 증량 사다리에 올라탄다.
const DEFAULT_STARTING_WEIGHTS: Record<Lift, Partial<Record<Tier, number>>> = {
  squat: { T1: 50, T2: 40 },
  bench: { T1: 50, T2: 40 },
  deadlift: { T1: 70, T2: 60 },
  ohp: { T1: 30, T2: 20 },
  lat_pulldown: { T3: 25 },
  db_row: { T3: 6 },
};

export function nextDayType(lastDayType: number | null): DayType {
  if (lastDayType == null) return 1;
  return ((lastDayType % 4) + 1) as DayType;
}

// Epley 추정 1RM (reps=1이면 그대로).
function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + (reps - 1) / 30);
}

// 해당 스테이지의 처방 렙 수(AMRAP 최소치 = 3대 추정의 바닥값).
function amrapMin(tier: Tier, stage: Stage): number {
  return STAGE_SETS[tier][stage].reps;
}

// 3대(스쿼트+벤치+데드) T1 상태로 보수적 SBD 1RM 합 추정. 하나라도 없으면 null.
export function estimateSBDTotal(state: LiftState[]): number | null {
  const lifts: Lift[] = ["squat", "bench", "deadlift"];
  let total = 0;
  for (const lift of lifts) {
    const row = state.find((s) => s.lift === lift && s.tier === "T1");
    if (!row) return null;
    total += epley1RM(row.weight, amrapMin("T1", row.stage));
  }
  return total;
}

// 리프트·티어별 현재(=다음에 할) 무게·스테이지.
export interface LiftState {
  lift: Lift;
  tier: Tier;
  weight: number;
  stage: Stage;
  needsManualReset?: boolean; // T1 스테이지3 실패 → 새 5RM 입력 대기
}

const ALL_TIER_LIFTS: { lift: Lift; tier: Tier }[] = [
  { lift: "squat", tier: "T1" },
  { lift: "squat", tier: "T2" },
  { lift: "bench", tier: "T1" },
  { lift: "bench", tier: "T2" },
  { lift: "deadlift", tier: "T1" },
  { lift: "deadlift", tier: "T2" },
  { lift: "ohp", tier: "T1" },
  { lift: "ohp", tier: "T2" },
  { lift: "lat_pulldown", tier: "T3" },
  { lift: "db_row", tier: "T3" },
];

const startWeight = (lift: Lift, tier: Tier): number =>
  DEFAULT_STARTING_WEIGHTS[lift][tier] ?? 20;

/**
 * 세션 로그를 접어 각 (리프트, 티어)의 현재 무게·스테이지를 계산한다. 로그가 진실의
 * 원천 — 파생 상태 테이블 없이 매번 여기서 계산한다. 기록 없는 리프트는 기본 시작
 * 무게. T1 스테이지3 실패는 자동 계산 대신 수동 리셋 대기(needsManualReset)로 둔다.
 */
export function deriveState(sessions: TrainingSession[]): LiftState[] {
  const asc = sortBy(sessions, ["date"]);
  const t1 = new Map<Lift, T1Result>();
  const t2 = new Map<Lift, T2Result>();
  const t3 = new Map<Lift, T3Result>();
  const lastT2Stage1 = new Map<Lift, number>();

  for (const s of asc) {
    const plan = DAY_PLAN[s.day_type as DayType];
    t1.set(plan.t1, {
      lift: plan.t1,
      weight: s.t1_weight,
      stage: s.t1_stage as Stage,
      success: s.t1_success,
    });
    t2.set(plan.t2, {
      lift: plan.t2,
      weight: s.t2_weight,
      stage: s.t2_stage as Stage,
      success: s.t2_success,
    });
    if (s.t2_stage === 1) lastT2Stage1.set(plan.t2, s.t2_weight);
    t3.set(plan.t3, { lift: plan.t3, weight: s.t3_weight, hit_25: s.t3_hit25 });
  }

  return ALL_TIER_LIFTS.map(({ lift, tier }): LiftState => {
    if (tier === "T1") {
      const res = t1.get(lift);
      if (!res)
        return { lift, tier, weight: startWeight(lift, tier), stage: 1 };
      const out = evalT1(res);
      if (out.kind === "success")
        return { lift, tier, weight: out.nextWeight, stage: out.stage };
      if (out.kind === "stage_up")
        return { lift, tier, weight: out.weight, stage: out.nextStage };
      return {
        lift,
        tier,
        weight: out.weight,
        stage: 1,
        needsManualReset: true,
      };
    }
    if (tier === "T2") {
      const res = t2.get(lift);
      if (!res)
        return { lift, tier, weight: startWeight(lift, tier), stage: 1 };
      const out = evalT2(res, lastT2Stage1.get(lift) ?? null);
      if (out.kind === "success")
        return { lift, tier, weight: out.nextWeight, stage: out.stage };
      if (out.kind === "stage_up")
        return { lift, tier, weight: out.weight, stage: out.nextStage };
      return { lift, tier, weight: out.newWeight, stage: 1 };
    }
    const res = t3.get(lift);
    if (!res) return { lift, tier, weight: startWeight(lift, tier), stage: 1 };
    return { lift, tier, weight: evalT3(res).nextWeight, stage: 1 };
  });
}
