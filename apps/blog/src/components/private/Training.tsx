import { actions } from "astro:actions";
import Button from "@yeolyi/ui/Button";
import Checkbox from "@yeolyi/ui/Checkbox";
import Input from "@yeolyi/ui/Input";
import Slider from "@yeolyi/ui/Slider";
import { useCallback, useEffect, useState } from "react";
import {
  DAY_PLAN,
  DAY_THEME,
  type DayType,
  deriveState,
  estimateSBDTotal,
  LIFT_LABEL,
  type Lift,
  type LiftState,
  nextDayType,
  REST_BY_TIER,
  STAGE_SETS,
  type Tier,
  type TrainingSession,
} from "@/components/private/lib/training";

const todayISO = () => new Date().toLocaleDateString("en-CA"); // 로컬 YYYY-MM-DD

// 유산소는 4일 순환과 무관해 요일로 못박는다(화·토). 근력은 주 3회를 4일 순환에 태우므로
// 요일과 어긋난다 — 그래서 근력의 day_type 은 요일이 아니라 마지막 로그에서 계산한다.
const CARDIO_MINUTES: Record<number, number> = { 2: 25, 6: 35 }; // 화 25분 · 토 35분
const cardioToday = () => CARDIO_MINUTES[new Date().getDay()] ?? null;

// 아일랜드 내부는 prose 스타일이 닿지 않으므로 위젯이 스스로 레이아웃한다(블로그의
// 다른 인터랙티브 컴포넌트와 동일). font-mono·간격·DS 토큰만 사용, 구분선은 안 쓴다.
export default function Training() {
  const [sessions, setSessions] = useState<TrainingSession[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await actions.training.listSessions({ limit: 60 });
    setSessions(data?.sessions ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (sessions === null) return <p className="font-mono">불러오는 중…</p>;

  const state = deriveState(sessions);
  const stateOf = (lift: Lift, tier: Tier): LiftState =>
    state.find((s) => s.lift === lift && s.tier === tier) as LiftState;

  // 마지막 로그에서 이어간다. 하루 빠뜨려도 그 날 것이 다음 세션으로 밀릴 뿐 유실되지 않는다.
  const day = nextDayType(sessions[0]?.day_type ?? null);
  const plan = DAY_PLAN[day];
  const sbd = estimateSBDTotal(state);
  const cardio = cardioToday();

  return (
    <div className="my-[1rlh] flex flex-col gap-[1rlh] font-mono">
      <p>
        <strong className="font-bold">{DAY_THEME[day]}</strong>
        {sbd != null && (
          <>
            {" · "}
            <span className="text-muted-foreground">3대 예상</span>{" "}
            <strong className="font-bold">{Math.round(sbd)}</strong>
            <span className="text-muted-foreground">kg</span>
          </>
        )}
      </p>
      {cardio != null && (
        <p className="text-muted-foreground">
          오늘은 야외 달리기 {cardio}분, 심박 130~150(넘으면 걷기)
        </p>
      )}
      <TodayForm
        day={day}
        t1={stateOf(plan.t1, "T1")}
        t2={stateOf(plan.t2, "T2")}
        t3={stateOf(plan.t3, "T3")}
        onSaved={load}
      />
    </div>
  );
}

function TodayForm({
  day,
  t1,
  t2,
  t3,
  onSaved,
}: {
  day: DayType;
  t1: LiftState;
  t2: LiftState;
  t3: LiftState;
  onSaved: () => Promise<void>;
}) {
  const [resetWeight, setResetWeight] = useState(String(t1.weight));
  const [t1ok, setT1ok] = useState(true);
  const [t2ok, setT2ok] = useState(true);
  const [t3hit, setT3hit] = useState(false);
  const [saving, setSaving] = useState(false);

  const t1Weight = t1.needsManualReset ? Number(resetWeight) : t1.weight;

  const save = async () => {
    setSaving(true);
    const { error } = await actions.training.saveSession({
      date: todayISO(),
      day_type: day,
      t1_weight: t1Weight,
      t1_stage: t1.stage,
      t1_success: t1ok,
      t2_weight: t2.weight,
      t2_stage: t2.stage,
      t2_success: t2ok,
      t3_weight: t3.weight,
      t3_hit25: t3hit,
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    await onSaved();
  };

  return (
    <>
      <div className="flex flex-col gap-[1rlh]">
        <TierBlock
          row={t1}
          done={t1ok}
          setDone={setT1ok}
          doneLabel="성공"
          resetWeight={resetWeight}
          setResetWeight={setResetWeight}
        />
        <TierBlock row={t2} done={t2ok} setDone={setT2ok} doneLabel="성공" />
        <TierBlock row={t3} done={t3hit} setDone={setT3hit} doneLabel="25개" />
      </div>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? "저장 중…" : "오늘 기록 저장"}
        </Button>
      </div>
    </>
  );
}

function TierBlock({
  row,
  done,
  setDone,
  doneLabel,
  resetWeight,
  setResetWeight,
}: {
  row: LiftState;
  done: boolean;
  setDone: (v: boolean) => void;
  doneLabel: string;
  resetWeight?: string;
  setResetWeight?: (v: string) => void;
}) {
  const sched = STAGE_SETS[row.tier][row.stage];
  const [sets, setSets] = useState(0);

  return (
    <div className="flex flex-col gap-[0.5rlh]">
      <div className="flex items-baseline justify-between gap-[1ch]">
        <span>
          <span className="text-muted-foreground">{row.tier}</span>{" "}
          <strong className="font-bold">{LIFT_LABEL[row.lift]}</strong>{" "}
          <span className="text-muted-foreground">
            {sched.sets}×{sched.reps}
            {sched.amrap ? "+" : ""} · S{row.stage} · 휴식{" "}
            {REST_BY_TIER[row.tier]}
          </span>
        </span>
        <span className="shrink-0">
          {row.needsManualReset && setResetWeight ? (
            <Input
              type="number"
              inputMode="decimal"
              value={resetWeight}
              className="w-[6ch] min-w-[5ch]"
              aria-label="새 5RM 무게"
              onChange={(e) => setResetWeight(e.target.value)}
            />
          ) : (
            <strong className="font-bold">{row.weight}</strong>
          )}
          <span className="text-muted-foreground">kg</span>
        </span>
      </div>
      <Slider
        min={0}
        max={sched.sets}
        value={sets}
        onValueChange={setSets}
        aria-label={`${row.tier} 완료 세트`}
      />
      <div className="flex items-center gap-[1.5ch]">
        <span className="text-muted-foreground">
          {sets}/{sched.sets}세트
        </span>
        <Checkbox checked={done} onCheckedChange={setDone}>
          {doneLabel}
        </Checkbox>
      </div>
    </div>
  );
}
