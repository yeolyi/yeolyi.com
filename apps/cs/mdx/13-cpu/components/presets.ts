import { type Line, NOOP } from "./store";

const pad = (lines: Line[]): Line[] => [
  ...lines,
  ...Array(16 - lines.length).fill(NOOP),
];

export const PRESETS: { name: string; slots: Line[] }[] = [
  {
    name: "피보나치 수열",
    slots: pad([
      { op: "LDI", arg1: "R0", arg2: "1" },
      { op: "LDI", arg1: "R1", arg2: "1" },
      { op: "MOVE", arg1: "R2", arg2: "R1" },
      { op: "ADD", arg1: "R1", arg2: "R0" },
      { op: "MOVE", arg1: "R0", arg2: "R2" },
      { op: "JUMP", arg1: "2", arg2: "" },
    ]),
  },
  {
    name: "삼각수 (1+2+3+...)",
    slots: pad([
      { op: "LDI", arg1: "R1", arg2: "1" },
      { op: "ADD", arg1: "R0", arg2: "R1" },
      { op: "ADDI", arg1: "R1", arg2: "1" },
      { op: "JUMP", arg1: "1", arg2: "" },
    ]),
  },
  {
    name: "오버플로우 탐지",
    slots: pad([
      { op: "LDI", arg1: "R0", arg2: "1" },
      { op: "ADD", arg1: "R0", arg2: "R0" },
      { op: "JZ", arg1: "5", arg2: "" },
      { op: "ADDI", arg1: "R1", arg2: "1" },
      { op: "JUMP", arg1: "1", arg2: "" },
    ]),
  },
  {
    name: "메모리 카운터",
    slots: pad([
      { op: "LDI", arg1: "R0", arg2: "1" },
      { op: "STORE", arg1: "15", arg2: "" },
      { op: "LOAD", arg1: "15", arg2: "" },
      { op: "ADDI", arg1: "R0", arg2: "1" },
      { op: "STORE", arg1: "15", arg2: "" },
      { op: "JUMP", arg1: "2", arg2: "" },
    ]),
  },
];
