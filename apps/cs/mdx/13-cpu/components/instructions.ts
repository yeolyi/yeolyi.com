export const REG_MAP = ["R0", "R1", "R2", "R3"] as const;
export const IMM_MAX = 3;

// "R2" 같은 레지스터 이름 → 인덱스 (12·13 글 데모 공용)
export const regIndex = (v: string) =>
  (REG_MAP as readonly string[]).indexOf(v);

const REGISTERS = { R0: 0, R1: 1, R2: 2, R3: 3 } as const;

// ── Types ────────────────────────────────────────────

export type ActiveParts = {
  memory: boolean;
  pc: boolean;
  control: boolean;
  alu: boolean;
  registers: number | false;
};

type CpuContext = {
  ir: string;
  regs: readonly number[];
  memory: readonly number[];
  pc: number;
  zFlag: number;
};

type ExecuteResult = {
  regs?: number[];
  memory?: number[];
  nextPc?: number;
  zFlag?: number;
  desc: string;
  active: Partial<ActiveParts>;
};

// ── Helpers ──────────────────────────────────────────

const toBits = (n: number, w: number) => n.toString(2).padStart(w, "0");
const regIdx = (s: string) =>
  REGISTERS[s.toUpperCase() as keyof typeof REGISTERS] ?? 0;

// ── Abstract classes ─────────────────────────────────

export abstract class Instruction {
  abstract readonly name: string;
  abstract readonly opcode: string;
  abstract readonly typeName: string;
  abstract readonly operands: readonly { label: string; bits: number }[];
  abstract readonly description: string;
  abstract readonly signals: {
    register: string;
    memory: string;
    alu: string;
  };
  abstract readonly example: { asm: string; binary: string };

  get format() {
    return `${this.name} ${this.operands.map((o) => o.label).join(", ")}`;
  }

  get structure() {
    return [{ label: this.opcode, bits: 4 }, ...this.operands];
  }

  abstract assemble(args: string[]): string;
  abstract disassemble(ir: string): string;
  abstract execute(ctx: CpuContext): ExecuteResult;
}

abstract class RType extends Instruction {
  readonly typeName = "R-Type";
  readonly operands = [
    { label: "Rd", bits: 2 },
    { label: "Rs", bits: 2 },
  ] as const;

  protected parseR(ir: string) {
    return {
      rd: Number.parseInt(ir.substring(4, 6), 2),
      rs: Number.parseInt(ir.substring(6, 8), 2),
    };
  }

  assemble(args: string[]) {
    return toBits(regIdx(args[0]), 2) + toBits(regIdx(args[1]), 2);
  }

  disassemble(ir: string) {
    const { rd, rs } = this.parseR(ir);
    return `${this.name} ${REG_MAP[rd]}, ${REG_MAP[rs]}`;
  }

  protected arithExecute(
    ctx: CpuContext,
    op: (a: number, b: number) => number,
    symbol: string,
  ): ExecuteResult {
    const { rd, rs } = this.parseR(ctx.ir);
    const result = op(ctx.regs[rd], ctx.regs[rs]) & 0xff;
    const newRegs = [...ctx.regs];
    newRegs[rd] = result;
    return {
      regs: newRegs,
      zFlag: result === 0 ? 1 : 0,
      desc: `${REG_MAP[rd]}(${ctx.regs[rd]}) ${symbol} ${REG_MAP[rs]}(${ctx.regs[rs]}) = ${result}`,
      active: { registers: rd, alu: true },
    };
  }
}

abstract class IType extends Instruction {
  readonly typeName = "I-Type";
  readonly operands = [
    { label: "Rd", bits: 2 },
    { label: "Imm", bits: 2 },
  ] as const;

  protected parseI(ir: string) {
    return {
      rd: Number.parseInt(ir.substring(4, 6), 2),
      imm: Number.parseInt(ir.substring(6, 8), 2),
    };
  }

  assemble(args: string[]) {
    return (
      toBits(regIdx(args[0]), 2) + toBits(Number.parseInt(args[1], 10) || 0, 2)
    );
  }

  disassemble(ir: string) {
    const { rd, imm } = this.parseI(ir);
    return `${this.name} ${REG_MAP[rd]}, ${imm}`;
  }

  protected arithExecute(
    ctx: CpuContext,
    op: (a: number, b: number) => number,
    symbol: string,
  ): ExecuteResult {
    const { rd, imm } = this.parseI(ctx.ir);
    const result = op(ctx.regs[rd], imm) & 0xff;
    const newRegs = [...ctx.regs];
    newRegs[rd] = result;
    return {
      regs: newRegs,
      zFlag: result === 0 ? 1 : 0,
      desc: `${REG_MAP[rd]}(${ctx.regs[rd]}) ${symbol} ${imm} = ${result}`,
      active: { registers: rd, alu: true },
    };
  }
}

abstract class MType extends Instruction {
  readonly typeName = "M-Type";
  readonly operands = [{ label: "Addr", bits: 4 }] as const;

  protected parseAddr(ir: string) {
    return Number.parseInt(ir.substring(4, 8), 2);
  }

  assemble(args: string[]) {
    return toBits(Number.parseInt(args[0], 10) || 0, 4);
  }

  disassemble(ir: string) {
    return `${this.name} ${this.parseAddr(ir)}`;
  }
}

// ── R-Type instructions ──────────────────────────────

class Move extends RType {
  readonly name = "MOVE";
  readonly opcode = "0000";
  readonly description = "Rs의 값을 Rd로 복사한다.";
  readonly signals = {
    register: "Rs → Rd",
    memory: "사용 안 함",
    alu: "사용 안 함",
  };
  readonly example = { asm: "MOVE R1, R2", binary: "00000110" };

  execute({ ir, regs }: CpuContext) {
    const { rd, rs } = this.parseR(ir);
    const newRegs = [...regs];
    newRegs[rd] = regs[rs];
    return {
      regs: newRegs,
      desc: `${REG_MAP[rs]}(${regs[rs]}) → ${REG_MAP[rd]}`,
      active: { registers: rd },
    };
  }
}

class Add extends RType {
  readonly name = "ADD";
  readonly opcode = "0001";
  readonly description = "Rd + Rs 결과를 Rd에 저장한다.";
  readonly signals = {
    register: "Rd, Rs → ALU → Rd",
    memory: "사용 안 함",
    alu: "덧셈",
  };
  readonly example = { asm: "ADD R0, R1", binary: "00010001" };

  execute(ctx: CpuContext) {
    return this.arithExecute(ctx, (a, b) => a + b, "+");
  }
}

class Sub extends RType {
  readonly name = "SUB";
  readonly opcode = "0010";
  readonly description = "Rd - Rs 결과를 Rd에 저장한다.";
  readonly signals = {
    register: "Rd, Rs → ALU → Rd",
    memory: "사용 안 함",
    alu: "뺄셈",
  };
  readonly example = { asm: "SUB R3, R1", binary: "00101101" };

  execute(ctx: CpuContext) {
    return this.arithExecute(ctx, (a, b) => a - b + 256, "-");
  }
}

// ── I-Type instructions ──────────────────────────────

class Addi extends IType {
  readonly name = "ADDI";
  readonly opcode = "0100";
  readonly description = "Rd에 즉시값을 더한다.";
  readonly signals = {
    register: "Rd → ALU → Rd",
    memory: "사용 안 함",
    alu: "덧셈",
  };
  readonly example = { asm: "ADDI R1, 2", binary: "01000110" };

  execute(ctx: CpuContext) {
    return this.arithExecute(ctx, (a, b) => a + b, "+");
  }
}

class Subi extends IType {
  readonly name = "SUBI";
  readonly opcode = "0101";
  readonly description = "Rd에서 즉시값을 뺀다.";
  readonly signals = {
    register: "Rd → ALU → Rd",
    memory: "사용 안 함",
    alu: "뺄셈",
  };
  readonly example = { asm: "SUBI R3, 1", binary: "01011101" };

  execute(ctx: CpuContext) {
    return this.arithExecute(ctx, (a, b) => a - b + 256, "-");
  }
}

class Ldi extends IType {
  readonly name = "LDI";
  readonly opcode = "0110";
  readonly description = "즉시값을 Rd에 로드한다.";
  readonly signals = {
    register: "즉시값 → Rd",
    memory: "사용 안 함",
    alu: "사용 안 함",
  };
  readonly example = { asm: "LDI R0, 3", binary: "01100011" };

  execute({ ir, regs }: CpuContext) {
    const { rd, imm } = this.parseI(ir);
    const newRegs = [...regs];
    newRegs[rd] = imm;
    return {
      regs: newRegs,
      desc: `${imm} → ${REG_MAP[rd]}`,
      active: { registers: rd },
    };
  }
}

// ── M-Type instructions ──────────────────────────────

class Load extends MType {
  readonly name = "LOAD";
  readonly opcode = "1000";
  readonly description = "메모리에서 값을 읽어 R0에 저장한다.";
  readonly signals = {
    register: "메모리 → R0",
    memory: "읽기",
    alu: "사용 안 함",
  };
  readonly example = { asm: "LOAD 10", binary: "10001010" };

  execute({ ir, regs, memory }: CpuContext) {
    const addr = this.parseAddr(ir);
    const newRegs = [...regs];
    newRegs[0] = memory[addr];
    return {
      regs: newRegs,
      desc: `메모리[${addr}](${memory[addr]}) → R0`,
      active: { memory: true, registers: 0 },
    };
  }
}

class Store extends MType {
  readonly name = "STORE";
  readonly opcode = "1001";
  readonly description = "R0의 값을 메모리에 저장한다.";
  readonly signals = {
    register: "R0 → 메모리",
    memory: "쓰기",
    alu: "사용 안 함",
  };
  readonly example = { asm: "STORE 5", binary: "10010101" };

  execute({ ir, regs, memory }: CpuContext) {
    const addr = this.parseAddr(ir);
    const newMemory = [...memory];
    newMemory[addr] = regs[0];
    return {
      memory: newMemory,
      desc: `R0(${regs[0]}) → 메모리[${addr}]`,
      active: { memory: true },
    };
  }
}

class Jump extends MType {
  readonly name = "JUMP";
  readonly opcode = "1100";
  readonly description = "PC를 Addr로 변경한다.";
  readonly signals = {
    register: "PC 변경",
    memory: "사용 안 함",
    alu: "사용 안 함",
  };
  readonly example = { asm: "JUMP 3", binary: "11000011" };

  execute({ ir }: CpuContext) {
    const addr = this.parseAddr(ir);
    return {
      nextPc: addr,
      desc: `PC → ${addr}`,
      active: { pc: true },
    };
  }
}

class Jz extends MType {
  readonly name = "JZ";
  readonly opcode = "1101";
  readonly description = "Z 플래그가 1이면 Addr로 점프한다.";
  readonly signals = {
    register: "Z에 따라 PC 변경",
    memory: "사용 안 함",
    alu: "사용 안 함",
  };
  readonly example = { asm: "JZ 15", binary: "11011111" };

  execute({ ir, zFlag }: CpuContext) {
    const addr = this.parseAddr(ir);
    if (zFlag === 1) {
      return {
        nextPc: addr,
        desc: `Z=1이므로 PC → ${addr}`,
        active: { pc: true },
      };
    }
    return { desc: "Z=0이므로 PC 유지", active: { pc: true } };
  }
}

// ── Instruction set ──────────────────────────────────

export const INSTRUCTION_SET: Record<string, Instruction> = {
  "0000": new Move(),
  "0001": new Add(),
  "0010": new Sub(),
  "0100": new Addi(),
  "0101": new Subi(),
  "0110": new Ldi(),
  "1000": new Load(),
  "1001": new Store(),
  "1100": new Jump(),
  "1101": new Jz(),
};
