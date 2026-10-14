import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { type ActiveParts, REG_MAP } from "../instructions";
import type { ControlSignals, Phase } from "../store";

const PHASE_LABELS: { key: Phase; label: string }[] = [
  { key: "fetch", label: "Fetch" },
  { key: "decode", label: "Decode" },
  { key: "execute", label: "Execute" },
];

function PhaseIndicator({ phase }: { phase: Phase }) {
  return (
    <div className="flex items-center gap-2">
      {PHASE_LABELS.map(({ key, label }, i) => (
        <span key={key} className="flex items-center gap-2">
          <span
            className={clsx(
              "border px-2 py-0.5",
              phase === key ? "mark" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {i < PHASE_LABELS.length - 1 && (
            <ArrowRight
              aria-hidden
              className="text-muted-foreground size-[1.2em]"
            />
          )}
        </span>
      ))}
    </div>
  );
}

const SIGNAL_KEYS = ["register", "memory", "alu"] as const;

export function CpuState({
  activeParts,
  pc,
  regs,
  zFlag,
  phase,
  phaseDesc,
  controlSignals,
}: {
  activeParts: ActiveParts;
  pc: number;
  regs: number[];
  zFlag: number;
  phase: Phase;
  phaseDesc: string;
  controlSignals: ControlSignals;
}) {
  const signalLabels = ["레지스터", "메모리", "ALU"];

  const box = (active: boolean) =>
    clsx(
      "border px-3 py-2 transition-colors",
      // 지금 쓰이는 부품은 반전(mark). 안의 보조 색 라벨도 반전 글자색으로 뒤집는다.
      active
        ? "mark border-foreground [&_.text-muted-foreground]:text-background"
        : "bg-background",
    );

  const descIn = (target: "pc" | "control" | "alu") => {
    if (!phaseDesc) return false;
    if (phase === "fetch") return target === "pc";
    if (phase === "decode") return target === "control";
    if (phase === "execute") {
      if (activeParts.alu) return target === "alu";
      if (activeParts.pc) return target === "pc";
    }
    return false;
  };

  return (
    <div className="space-y-2 border p-3">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">CPU</div>
        <PhaseIndicator phase={phase} />
      </div>
      <div className="flex min-h-28.5 gap-2">
        <div className={clsx(box(activeParts.pc))}>
          <div className="text-muted-foreground">PC</div>
          <div className="font-mono">{pc}</div>
          {descIn("pc") && <div className="mt-1 font-mono">{phaseDesc}</div>}
        </div>
        <div className={clsx(box(activeParts.control), "flex-1")}>
          <div className="text-muted-foreground">제어 장치</div>
          {descIn("control") && (
            <>
              <div className="mt-1 font-mono">{phaseDesc}</div>
              {controlSignals && (
                <div className="mt-1 space-y-0.5">
                  {signalLabels.map((label, i) => (
                    <div key={label} className="flex">
                      <span className="text-muted-foreground w-16 shrink-0">
                        {label}
                      </span>
                      <span>{controlSignals[SIGNAL_KEYS[i]]}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {regs.map((val, i) => (
          <div
            key={REG_MAP[i]}
            className={clsx(box(activeParts.registers === i), "text-center")}
          >
            <div className="text-muted-foreground">{REG_MAP[i]}</div>
            <div className="font-mono">{val}</div>
          </div>
        ))}
        <div className={clsx(box(false), "text-center")}>
          <div className={clsx(!zFlag && "text-muted-foreground")}>Z</div>
          <div className={clsx("font-mono", zFlag && "mark px-[0.4ch]")}>
            {zFlag}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground flex items-center justify-center gap-1">
        ↕
      </div>
      <div className={clsx(box(activeParts.alu), "min-h-14.5")}>
        <div className="text-muted-foreground">ALU</div>
        {descIn("alu") && <div className="mt-1 font-mono">{phaseDesc}</div>}
      </div>
    </div>
  );
}
