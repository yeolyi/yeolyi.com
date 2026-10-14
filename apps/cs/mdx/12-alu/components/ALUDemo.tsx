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
import { useState } from "react";

const OPS = ["ADD", "SUB", "ADDI", "SUBI"] as const;
type Op = (typeof OPS)[number];

export function ALUDemo() {
  const [registers, setRegisters] = useState([5, 3, 0, 0]);
  const [op, setOp] = useState<Op>("ADD");
  const [rd, setRd] = useState(0);
  const [rs, setRs] = useState(1);
  const [imm, setImm] = useState(1);
  const [zFlag, setZFlag] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const isImm = op === "ADDI" || op === "SUBI";
  const isAdd = op === "ADD" || op === "ADDI";

  const execute = () => {
    const a = registers[rd];
    const b = isImm ? imm : registers[rs];
    const result = isAdd ? (a + b) & 0xff : (a - b + 256) & 0xff;
    setRegisters(registers.map((v, i) => (i === rd ? result : v)));
    setZFlag(result === 0 ? 1 : 0);
    setLastResult(result);
  };

  const label = isImm
    ? `${op} ${REG_MAP[rd]}, ${imm}`
    : `${op} ${REG_MAP[rd]}, ${REG_MAP[rs]}`;

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-col gap-4 @md:flex-row @md:items-start">
        <div className="flex w-full flex-1 flex-col gap-3">
          <div>레지스터</div>
          <div>
            {registers.map((val, i) => (
              <div
                key={i}
                className={clsx(
                  "flex items-center justify-between border-x border-t px-3 py-1.5 font-mono last:border-b",
                  i === rd && "mark",
                )}
              >
                {/* 반전된 칸에선 보조 색 대신 반전 글자색을 따른다 */}
                <span className={clsx(i !== rd && "text-muted-foreground")}>
                  {REG_MAP[i]}
                </span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col gap-3">
          <RadioGroup
            aria-label="연산"
            value={op}
            onValueChange={(v) => setOp(v as Op)}
            options={[...OPS]}
          />

          <div className="flex items-center gap-2">
            <span>Rd</span>
            <RadioGroup
              aria-label="Rd"
              value={REG_MAP[rd]}
              onValueChange={(v) => setRd(regIndex(v))}
              options={[...REG_MAP]}
            />
          </div>

          {isImm ? (
            <div className="flex items-center gap-2">
              <span>Imm</span>
              <Stepper
                value={imm}
                min={0}
                max={IMM_MAX}
                onValueChange={setImm}
              />
            </div>
          ) : (
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

          <Button onClick={execute}>{label}</Button>

          <div className="bg-background border p-3">
            <div className="flex items-center justify-between">
              <span>결과</span>
              <span className="font-mono">
                {lastResult !== null ? lastResult : "-"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Z 플래그</span>
              <span
                className={clsx("font-mono", zFlag === 1 && "mark px-[0.4ch]")}
              >
                {zFlag}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
