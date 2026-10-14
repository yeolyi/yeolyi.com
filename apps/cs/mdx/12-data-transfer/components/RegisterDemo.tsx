/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-length arrays */

import {
  IMM_MAX,
  REG_MAP,
  regIndex,
} from "@mdx/13-cpu/components/instructions";
import { Stepper } from "@mdx/13-cpu/components/Stepper";
import Button from "@yeolyi/ui/Button";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

const INITIAL_MEMORY = [10, 20, 0, 0];
const OPS = ["LOAD", "STORE", "LDI", "MOVE"] as const;
type Op = (typeof OPS)[number];

export function RegisterDemo() {
  const [memory, setMemory] = useState(INITIAL_MEMORY);
  const [registers, setRegisters] = useState([0, 0, 0, 0]);
  const [addr, setAddr] = useState(0);
  const [op, setOp] = useState<Op>("LOAD");
  const [rd, setRd] = useState(0);
  const [rs, setRs] = useState(1);
  const [imm, setImm] = useState(0);
  const [flash, setFlash] = useState<"load" | "store" | "reg" | null>(null);

  const animate = (dir: "load" | "store" | "reg") => {
    setFlash(dir);
    setTimeout(() => setFlash(null), 400);
  };

  const setReg = (i: number, v: number) =>
    setRegisters(registers.map((r, j) => (j === i ? v : r)));

  const execute = () => {
    switch (op) {
      case "LOAD":
        setReg(0, memory[addr]);
        animate("load");
        break;
      case "STORE":
        setMemory(memory.map((v, i) => (i === addr ? registers[0] : v)));
        animate("store");
        break;
      case "LDI":
        setReg(rd, imm);
        animate("reg");
        break;
      case "MOVE":
        setReg(rd, registers[rs]);
        animate("reg");
        break;
    }
  };

  const label =
    op === "LOAD"
      ? `LOAD ${addr}`
      : op === "STORE"
        ? `STORE ${addr}`
        : op === "LDI"
          ? `LDI ${REG_MAP[rd]}, ${imm}`
          : `MOVE ${REG_MAP[rd]}, ${REG_MAP[rs]}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="mb-2">메모리</div>
          {memory.map((val, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAddr(i)}
              className={clsx(
                "focus-border hover:bg-foreground hover:text-background hover:[&_.text-muted-foreground]:text-background flex w-full cursor-pointer items-center justify-between border-x border-t px-3 py-1.5 font-mono transition-colors last:border-b",
                // 고른 주소는 반전(mark). 안의 보조 색 주소도 반전 글자색으로 뒤집는다.
                (op === "LOAD" || op === "STORE") &&
                  i === addr &&
                  "mark [&_.text-muted-foreground]:text-background",
              )}
            >
              <span className="text-muted-foreground">
                {i.toString(2).padStart(4, "0")}
              </span>
              <span>{val}</span>
            </button>
          ))}
        </div>

        <div className="text-muted-foreground flex flex-col items-center gap-1">
          <span
            className={clsx(
              "flex items-center transition-opacity",
              flash === "load" ? "opacity-100" : "opacity-0",
            )}
          >
            <ArrowRight aria-hidden className="size-[1.2em]" />
          </span>
          <span
            className={clsx(
              "flex items-center transition-opacity",
              flash === "store" ? "opacity-100" : "opacity-0",
            )}
          >
            <ArrowLeft aria-hidden className="size-[1.2em]" />
          </span>
        </div>

        <div className="flex-1">
          <div className="mb-2">레지스터</div>
          {registers.map((val, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-center justify-between border-x border-t px-3 py-1.5 font-mono transition-colors last:border-b",
                flash &&
                  (op === "LOAD"
                    ? i === 0
                    : op === "STORE"
                      ? i === 0
                      : i === rd) &&
                  "mark [&_.text-muted-foreground]:text-background",
              )}
            >
              <span className="text-muted-foreground">{REG_MAP[i]}</span>
              <span>{val}</span>
            </div>
          ))}
        </div>
      </div>

      <RadioGroup
        aria-label="연산"
        value={op}
        onValueChange={(v) => setOp(v as Op)}
        options={[...OPS]}
      />

      {(op === "LDI" || op === "MOVE") && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span>Rd</span>
            <RadioGroup
              aria-label="Rd"
              value={REG_MAP[rd]}
              onValueChange={(v) => setRd(regIndex(v))}
              options={[...REG_MAP]}
            />
          </div>
          {op === "MOVE" && (
            <div className="flex items-center gap-2">
              <span>Rs</span>
              <RadioGroup
                aria-label="Rs"
                value={REG_MAP[rs]}
                onValueChange={(v) => setRs(regIndex(v))}
                options={[...REG_MAP]}
              />
            </div>
          )}
          {op === "LDI" && (
            <div className="flex items-center gap-2">
              <span>Imm</span>
              <Stepper
                value={imm}
                min={0}
                max={IMM_MAX}
                onValueChange={setImm}
              />
            </div>
          )}
        </div>
      )}

      <Button onClick={execute}>{label}</Button>
    </div>
  );
}
