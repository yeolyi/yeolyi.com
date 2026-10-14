/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-length arrays */

import { INSTRUCTION_SET } from "@mdx/13-cpu/components/instructions";
import { clsx } from "clsx";
import { useState } from "react";

export function InstructionDecoder() {
  const [bits, setBits] = useState([0, 1, 1, 0, 0, 0, 1, 1]); // LDI R0, 3

  const toggle = (i: number) =>
    setBits(bits.map((b, j) => (j === i ? 1 - b : b)));

  const ir = bits.join("");
  const info = INSTRUCTION_SET[ir.substring(0, 4)] ?? null;
  const asm = info?.disassemble(ir);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-1">
        {bits.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={clsx(
              "border-foreground focus-border press-down size-10 cursor-pointer border-2 font-mono transition-colors",
              b === 1
                ? "mark"
                : "bg-background hover:bg-foreground hover:text-background",
              i === 4 && "ml-3",
            )}
          >
            {b}
          </button>
        ))}
      </div>

      {info && (
        <div className="flex h-10 w-full">
          {info.structure.map((part, idx) => (
            <div
              key={idx}
              className={clsx(
                "flex items-center justify-center border font-mono",
                part.bits === 4 ? "flex-1" : "w-1/4",
              )}
            >
              <span>{part.label}</span>
            </div>
          ))}
        </div>
      )}

      {info ? (
        <>
          <div>
            <span className="font-mono">{asm}</span>
            <p className="text-muted-foreground mt-1">{info.description}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <span className="w-24 shrink-0">레지스터</span>
              <span className="text-muted-foreground">
                {info.signals.register}
              </span>
            </div>
            <div className="flex items-start">
              <span className="w-24 shrink-0">메모리</span>
              <span className="text-muted-foreground">
                {info.signals.memory}
              </span>
            </div>
            <div className="flex items-start">
              <span className="w-24 shrink-0">ALU</span>
              <span className="text-muted-foreground">{info.signals.alu}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-center">
          유효하지 않은 명령어다.
        </p>
      )}
    </div>
  );
}
