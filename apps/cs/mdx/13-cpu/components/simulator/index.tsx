import Button from "@yeolyi/ui/Button";
import { Select, SelectItem } from "@yeolyi/ui/Select";
import { useEffect, useState } from "react";
import { PRESETS } from "../presets";
import { useCpuStore } from "../store";
import { CpuState } from "./CpuState";
import { InstructionBuilder } from "./InstructionBuilder";

export function VonNeumannSimulator() {
  const {
    isRunning,
    pc,
    regs,
    zFlag,
    phase,
    phaseDesc,
    controlSignals,
    activeParts,
    binaryInstructions,
    setSlots,
    load,
    reset,
    step,
  } = useCpuStore();

  const isDone = phase === "execute" && pc >= binaryInstructions.length;
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay || isDone) {
      setAutoPlay(false);
      return;
    }
    const id = setInterval(step, 250);
    return () => clearInterval(id);
  }, [autoPlay, isDone, step]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">메모리</div>
        {!isRunning && (
          <Select
            aria-label="프리셋"
            placeholder="프리셋"
            onValueChange={(val) => {
              const preset = PRESETS[Number(val)];
              if (preset) setSlots(preset.slots);
            }}
          >
            {PRESETS.map((p, i) => (
              <SelectItem key={p.name} value={String(i)}>
                {p.name}
              </SelectItem>
            ))}
          </Select>
        )}
      </div>
      <InstructionBuilder disabled={isRunning} pc={pc} />

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <Button onClick={load}>로드</Button>
          ) : (
            <>
              <Button onClick={() => setAutoPlay(!autoPlay)} disabled={isDone}>
                {autoPlay ? "정지" : "재생"}
              </Button>
              <Button
                onClick={() => {
                  setAutoPlay(false);
                  step();
                }}
                disabled={isDone || autoPlay}
              >
                다음
              </Button>
              <div className="w-2" />
              <Button
                onClick={() => {
                  setAutoPlay(false);
                  reset();
                }}
              >
                초기화
              </Button>
            </>
          )}
        </div>
      </div>

      {isRunning && (
        <CpuState
          activeParts={activeParts}
          pc={pc}
          regs={regs}
          zFlag={zFlag}
          phase={phase}
          phaseDesc={phaseDesc}
          controlSignals={controlSignals}
        />
      )}
    </div>
  );
}
