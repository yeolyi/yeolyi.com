/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-length array */

import Button from "@yeolyi/ui/Button";
import Checkbox from "@yeolyi/ui/Checkbox";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { Table } from "@yeolyi/ui/Table";
import { clsx } from "clsx";
import { useState } from "react";
import { Stepper } from "../Stepper";

const OPS = ["NEXT", "JUMP", "JZ"] as const;
type Op = (typeof OPS)[number];

export function FetchDemo() {
  const MEMORY = [
    { binary: "01100001", asm: "LDI R0, 1" },
    { binary: "01100110", asm: "LDI R1, 2" },
    { binary: "00010001", asm: "ADD R0, R1" },
    { binary: "10010101", asm: "STORE 5" },
    { binary: "11000010", asm: "JUMP 2" },
    { binary: "00000000", asm: "데이터" },
  ];

  const OP_LABELS: Record<Op, string> = {
    NEXT: "다음",
    JUMP: "JUMP",
    JZ: "JZ",
  };

  const [pc, setPc] = useState(0);
  const [op, setOp] = useState<Op>("NEXT");
  const [target, setTarget] = useState(2);
  const [zFlag, setZFlag] = useState(0);

  const maxAddr = MEMORY.length - 1;

  const execute = () => {
    switch (op) {
      case "NEXT":
        setPc(Math.min(pc + 1, maxAddr));
        break;
      case "JUMP":
        setPc(target);
        break;
      case "JZ":
        if (zFlag === 1) setPc(target);
        break;
    }
  };

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-col gap-4 @md:flex-row">
        <div className="min-w-0 flex-1">
          <Table className="font-mono">
            <thead>
              <tr>
                <th>주소</th>
                <th>이진수</th>
                <th>어셈블리</th>
              </tr>
            </thead>
            <tbody>
              {MEMORY.map((row, idx) => (
                <tr key={idx} className={clsx(idx === pc && "mark")}>
                  <td>{idx}</td>
                  <td>{row.binary}</td>
                  <td>{row.asm}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div className="flex flex-col justify-center gap-3 @md:w-48">
          <div className="flex items-center justify-between">
            <span>PC</span>
            <span className="font-mono">{pc}</span>
          </div>

          <RadioGroup
            aria-label="연산"
            value={op}
            onValueChange={(v) => setOp(v as Op)}
            options={OPS.map((o) => ({ value: o, label: OP_LABELS[o] }))}
          />

          {(op === "JUMP" || op === "JZ") && (
            <div className="flex items-center justify-between">
              <span>목적지</span>
              <Stepper
                value={target}
                min={0}
                max={maxAddr}
                onValueChange={setTarget}
              />
            </div>
          )}

          {op === "JZ" && (
            <div className="flex items-center justify-between">
              <span>Z 플래그</span>
              <Checkbox
                aria-label="Z 플래그"
                checked={zFlag === 1}
                onCheckedChange={(c) => setZFlag(c ? 1 : 0)}
              />
            </div>
          )}

          <Button onClick={execute}>
            {op === "NEXT" ? "PC + 1" : `${op} ${target}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
