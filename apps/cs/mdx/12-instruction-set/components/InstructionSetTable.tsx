/** biome-ignore-all lint/suspicious/noArrayIndexKey: fixed-length arrays */

import { INSTRUCTION_SET } from "@mdx/13-cpu/components/instructions";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { clsx } from "clsx";
import { useState } from "react";

const entries = Object.values(INSTRUCTION_SET).toSorted((a, b) =>
  a.opcode.localeCompare(b.opcode),
);

export function InstructionSetTable() {
  const [selected, setSelected] = useState(entries[0].name);
  const inst = entries.find((e) => e.name === selected) ?? entries[0];

  return (
    <div className="flex flex-col gap-5">
      <RadioGroup
        aria-label="명령어"
        value={selected}
        onValueChange={setSelected}
        options={entries.map((e) => e.name)}
      />

      <div>
        <div className="font-mono">{inst.format}</div>
        <p className="text-muted-foreground mt-1">{inst.description}</p>
      </div>

      <div className="flex h-14 w-full">
        {inst.structure.map((part, idx) => (
          <div
            key={idx}
            className={clsx(
              "flex flex-col items-center justify-center border font-mono",
              part.bits === 4 ? "flex-1" : "w-1/4",
            )}
          >
            <span>{part.label}</span>
            <span className="text-muted-foreground">{part.bits}bit</span>
          </div>
        ))}
      </div>

      <div className="bg-muted flex items-center justify-between px-4 py-3 font-mono">
        <span>{inst.example.asm}</span>
        <span className="text-muted-foreground">{inst.example.binary}</span>
      </div>
    </div>
  );
}
