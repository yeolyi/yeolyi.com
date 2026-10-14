import { create } from "zustand";
import {
  type ActiveParts,
  INSTRUCTION_SET,
  type Instruction,
} from "./instructions";

// ── Types ──────────────────────────────────────────────

export type Phase = "fetch" | "decode" | "execute" | null;
export type ControlSignals = Instruction["signals"] | null;
export type Line = { op: string; arg1: string; arg2: string };

// ── Constants ──────────────────────────────────────────

const INACTIVE: ActiveParts = {
  memory: false,
  pc: false,
  control: false,
  alu: false,
  registers: false,
};

export const NOOP: Line = { op: "NOOP", arg1: "", arg2: "" };

const INITIAL_SLOTS: Line[] = [
  { op: "LDI", arg1: "R0", arg2: "1" },
  { op: "LDI", arg1: "R1", arg2: "1" },
  { op: "MOVE", arg1: "R2", arg2: "R1" },
  { op: "ADD", arg1: "R1", arg2: "R0" },
  { op: "MOVE", arg1: "R0", arg2: "R2" },
  { op: "JUMP", arg1: "2", arg2: "" },
  ...Array(10).fill(NOOP),
];

const FETCH_DESC = (pc: number, instr: string) =>
  `메모리[${pc}]에서 ${instr} 읽음`;

// ── Pure functions ─────────────────────────────────────

type InstructionType = "N" | "R" | "I" | "M";

export function getType(op: string): InstructionType {
  if (op === "NOOP") return "N";
  const entry = Object.values(INSTRUCTION_SET).find((v) => v.name === op);
  if (!entry) return "N";
  return entry.typeName[0] as InstructionType;
}

export function lineToAsm(line: Line): string {
  const type = getType(line.op);
  if (type === "N") return "";
  if (type === "M") return `${line.op} ${line.arg1}`;
  return `${line.op} ${line.arg1}, ${line.arg2}`;
}

export function asmToBinary(asm: string): string {
  if (!asm) return "00000000";
  const [mnemonic, ...args] = asm.split(/[\s,]+/);
  const entry = Object.entries(INSTRUCTION_SET).find(
    ([, v]) => v.name === mnemonic.toUpperCase(),
  );
  if (!entry) return "00000000";
  const [opcode, info] = entry;
  return opcode + info.assemble(args);
}

export function toBinary(num: number, bits: number): string {
  return num.toString(2).padStart(bits, "0");
}

// ── Store ──────────────────────────────────────────────

type CpuState = {
  slots: Line[];
  isRunning: boolean;
  pc: number;
  regs: number[];
  zFlag: number;
  memory: number[];
  phase: Phase;
  ir: string;
  phaseDesc: string;
  controlSignals: ControlSignals;
  activeParts: ActiveParts;
  binaryInstructions: string[];

  updateSlot: (idx: number, patch: Partial<Line>) => void;
  setSlots: (slots: Line[]) => void;
  load: () => void;
  reset: () => void;
  step: () => void;
};

export const useCpuStore = create<CpuState>((set, get) => ({
  slots: INITIAL_SLOTS,
  isRunning: false,
  pc: 0,
  regs: [0, 0, 0, 0],
  zFlag: 0,
  memory: Array(16).fill(0),
  phase: null,
  ir: "",
  phaseDesc: "",
  controlSignals: null,
  activeParts: { ...INACTIVE },
  binaryInstructions: [],

  updateSlot: (idx, patch) =>
    set((state) => ({
      slots: state.slots.map((s, i) => {
        if (i !== idx) return s;
        if (patch.op) {
          const type = getType(patch.op);
          if (type === "N") return NOOP;
          if (type === "R") return { op: patch.op, arg1: "R0", arg2: "R0" };
          if (type === "I") return { op: patch.op, arg1: "R0", arg2: "0" };
          return { op: patch.op, arg1: "0", arg2: "" };
        }
        return { ...s, ...patch };
      }),
    })),

  setSlots: (slots) => set({ slots }),

  load: () => {
    const { slots } = get();
    const newMemory = Array(16).fill(0);
    let lastInstrIdx = -1;

    for (let i = 0; i < slots.length; i++) {
      const asm = lineToAsm(slots[i]);
      if (asm) {
        newMemory[i] = Number.parseInt(asmToBinary(asm), 2);
        lastInstrIdx = i;
      }
    }

    set({
      memory: newMemory,
      binaryInstructions: newMemory
        .slice(0, lastInstrIdx + 1)
        .map((v) => toBinary(v, 8)),
      isRunning: true,
      pc: 0,
      regs: [0, 0, 0, 0],
      zFlag: 0,
      phase: null,
      ir: "",
      phaseDesc: "",
      controlSignals: null,
      activeParts: { ...INACTIVE },
    });
  },

  reset: () =>
    set({
      isRunning: false,
      pc: 0,
      regs: [0, 0, 0, 0],
      memory: Array(16).fill(0),
      zFlag: 0,
      binaryInstructions: [],
      phase: null,
      ir: "",
      phaseDesc: "",
      controlSignals: null,
      activeParts: { ...INACTIVE },
    }),

  step: () => {
    const { pc, binaryInstructions, phase, ir, regs, memory, zFlag } = get();
    if (pc >= binaryInstructions.length) return;

    if (phase === null || phase === "execute") {
      const instruction = binaryInstructions[pc];
      set({
        ir: instruction,
        phase: "fetch",
        phaseDesc: FETCH_DESC(pc, instruction),
        controlSignals: null,
        activeParts: { ...INACTIVE, memory: true, pc: true },
      });
      return;
    }

    if (phase === "fetch") {
      const opcode = ir.substring(0, 4);
      const info = INSTRUCTION_SET[opcode];
      set({
        phase: "decode",
        phaseDesc: `${ir} → ${info?.disassemble(ir) ?? "NOOP"}`,
        controlSignals: info?.signals ?? null,
        activeParts: { ...INACTIVE, control: true },
      });
      return;
    }

    if (phase === "decode") {
      const info = INSTRUCTION_SET[ir.substring(0, 4)];
      if (!info) {
        set({ pc: pc + 1, phase: "execute", controlSignals: null });
        return;
      }

      const result = info.execute({ ir, regs, memory, pc, zFlag });

      set({
        regs: result.regs?.map((v) => v & 0xff) ?? regs,
        memory: result.memory ?? memory,
        pc: result.nextPc ?? pc + 1,
        zFlag: result.zFlag ?? zFlag,
        phase: "execute",
        phaseDesc: result.desc,
        controlSignals: null,
        activeParts: { ...INACTIVE, ...result.active },
      });
    }
  },
}));
