import Button from "@yeolyi/ui/Button";
import { useState } from "react";
import { ControlUnit } from "./ControlUnit";
import { Tape } from "./Tape";
import { type TapeSymbol, TuringMachineProvider } from "./turingMachineStore";
import { useTuringMachine } from "./useTuringMachine";

function TuringMachineContent({
  initialTape,
  initialHeadIdx,
  rulesCsv: initialRulesCsv,
  editable,
}: {
  initialTape: TapeSymbol[];
  initialHeadIdx: number;
  rulesCsv: string;
  editable?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rulesCsv, setRulesCsv] = useState(initialRulesCsv);
  const {
    tape,
    headIdx,
    state,
    isRunning,
    step,
    reset,
    play,
    pause,
    rules,
    isHalted,
    hasStarted,
    setTapeCell,
  } = useTuringMachine(initialTape, initialHeadIdx, rulesCsv);

  const onRulesCsvChange = (newCsv: string) => {
    setRulesCsv(newCsv);
    setIsEditing(false);
    reset(newCsv);
  };

  const currentSymbol = tape[headIdx] || "_";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button onClick={() => reset()} disabled={isRunning || isEditing}>
          초기화
        </Button>
        <Button onClick={step} disabled={isRunning || isHalted || isEditing}>
          한 단계
        </Button>
        {isRunning ? (
          <Button onClick={pause} disabled={isHalted || isEditing}>
            일시정지
          </Button>
        ) : (
          <Button onClick={play} disabled={isRunning || isHalted || isEditing}>
            재생
          </Button>
        )}
      </div>
      <Tape
        tape={tape}
        head={headIdx}
        canEdit={!hasStarted}
        onCellClick={setTapeCell}
      />
      <ControlUnit
        rules={rules}
        currentState={state}
        currentSymbol={currentSymbol}
        editable={editable}
        rulesCsv={rulesCsv}
        onRulesCsvChange={onRulesCsvChange}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
      />
      <p className="text-muted-foreground mt-4">
        초기 상태: q0 / 정지 상태: q_halt / 빈 칸: _ / 실행 전 테이프 클릭으로
        값 수정 가능
      </p>
    </div>
  );
}

export default function TuringMachine({
  initialTape,
  initialHeadIdx,
  rulesCsv,
  editable,
}: {
  initialTape: TapeSymbol[];
  initialHeadIdx: number;
  rulesCsv: string;
  editable?: boolean;
}) {
  return (
    <TuringMachineProvider>
      <TuringMachineContent
        initialTape={initialTape}
        initialHeadIdx={initialHeadIdx}
        rulesCsv={rulesCsv}
        editable={editable}
      />
    </TuringMachineProvider>
  );
}
