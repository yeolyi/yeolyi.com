# instructions.ts: 함수형 vs 객체지향

원래 함수형 구현은 TYPE_META 룩업 테이블로 타입별 행위를 관리했는데, 이건 클래스
없이 vtable을 흉내낸 나쁜 FP였다. 여기서는 **잘 쓴 FP**와 **잘 쓴 OOP**를
비교한다.

## 함수형 구현

**핵심:** 타입 태그 + 독립 함수 + 고차 함수 합성

```ts
type InstructionType = "R" | "I" | "M";

// ── 타입별 상수/파서는 독립 함수 ──────────────────

const OPERANDS = {
  R: [{ label: "Rd", bits: 2 }, { label: "Rs", bits: 2 }],
  I: [{ label: "Rd", bits: 2 }, { label: "Imm", bits: 2 }],
  M: [{ label: "Addr", bits: 4 }],
} as const;

const parseR = (ir: string) => ({
  rd: parseInt(ir.substring(4, 6), 2),
  rs: parseInt(ir.substring(6, 8), 2),
});
const parseI = (ir: string) => ({
  rd: parseInt(ir.substring(4, 6), 2),
  imm: parseInt(ir.substring(6, 8), 2),
});
const parseM = (ir: string) => parseInt(ir.substring(4, 8), 2);

// ── 타입별 행위는 switch 분기 ─────────────────────

const assemble = (type: InstructionType, args: string[]): string => {
  switch (type) {
    case "R": return toBits(regIdx(args[0]), 2) + toBits(regIdx(args[1]), 2);
    case "I": return toBits(regIdx(args[0]), 2) + toBits(parseInt(args[1]) || 0, 2);
    case "M": return toBits(parseInt(args[0]) || 0, 4);
  }
};

const disassemble = (def: InstructionDef, ir: string): string => {
  switch (def.type) {
    case "R": { const { rd, rs } = parseR(ir); return `${def.name} ${REG_MAP[rd]}, ${REG_MAP[rs]}`; }
    case "I": { const { rd, imm } = parseI(ir); return `${def.name} ${REG_MAP[rd]}, ${imm}`; }
    case "M": return `${def.name} ${parseM(ir)}`;
  }
};

// ── 파생 속성은 함수로 도출 ───────────────────────

const formatOf = (d: InstructionDef) =>
  `${d.name} ${OPERANDS[d.type].map(o => o.label).join(", ")}`;

const structureOf = (d: InstructionDef) =>
  [{ label: d.opcode, bits: 4 }, ...OPERANDS[d.type]];

// ── 공유 execute는 고차 함수 ─────────────────────

const arithR = (op: (a: number, b: number) => number, sym: string) =>
  (ctx: CpuContext): ExecuteResult => {
    const { rd, rs } = parseR(ctx.ir);
    const result = op(ctx.regs[rd], ctx.regs[rs]) & 0xff;
    return { regs: setAt(ctx.regs, rd, result), zFlag: result === 0 ? 1 : 0, ... };
  };

// ── 명령어 = 완결된 plain object ─────────────────

type InstructionDef = {
  name: string;
  opcode: string;
  type: InstructionType;
  description: I18nString;
  signals: { register: I18nString; memory: I18nString; alu: I18nString };
  example: { asm: string; binary: string };
  execute: (ctx: CpuContext) => ExecuteResult;
};

const INSTRUCTION_SET: Record<string, InstructionDef> = {
  "0001": {
    name: "ADD", opcode: "0001", type: "R",
    description: { ko: "Rd + Rs 결과를 Rd에 저장한다.", en: "..." },
    signals: { ... },
    example: { asm: "ADD R0, R1", binary: "00010001" },
    execute: arithR((a, b) => a + b, "+"),
  },
  "1000": {
    name: "LOAD", opcode: "1000", type: "M",
    ...,
    execute: (ctx) => {
      const addr = parseM(ctx.ir);
      return { regs: setAt(ctx.regs, 0, ctx.memory[addr]), ... };
    },
  },
};
```

## 객체지향 구현

**핵심:** 추상 클래스 계층 + 구체 클래스

```ts
abstract class RType extends Instruction {
  readonly typeName = "R-Type";
  readonly operands = [{ label: "Rd", bits: 2 }, { label: "Rs", bits: 2 }];

  protected parseR(ir: string) { ... }
  assemble(args: string[]) { ... }
  disassemble(ir: string) { ... }
  protected arithExecute(ctx, op, symbol) { ... }
}

class Add extends RType {
  readonly name = "ADD";
  readonly opcode = "0001";
  readonly description = { ... };
  readonly signals = { ... };
  readonly example = { ... };

  execute(ctx: CpuContext) {
    return this.arithExecute(ctx, (a, b) => a + b, "+");
  }
}
```

## 비교

|                      | 함수형                                        | 객체지향                                  |
| -------------------- | --------------------------------------------- | ----------------------------------------- |
| 명령어 정의          | 오브젝트 리터럴 (데이터 + execute 함수)       | 클래스 (데이터 + 메서드)                  |
| 타입별 파싱          | 독립 함수 `parseR(ir)`                        | protected 메서드 `this.parseR(ir)`        |
| 타입별 assemble      | `switch (type)` 분기                          | 중간 클래스가 소유                        |
| 공유 execute 로직    | 고차 함수 `arithR(op, sym)`                   | protected 메서드 `this.arithExecute(...)` |
| 파생 속성            | 유틸 함수 `formatOf(def)`, `structureOf(def)` | getter `this.format`, `this.structure`    |
| 호출 형태            | `disassemble(inst, ir)`                       | `inst.disassemble(ir)`                    |
| 타입 분기            | `inst.type === "M"`                           | `inst instanceof MType`                   |
| 새 명령어 추가       | 오브젝트 리터럴 하나                          | 클래스 하나                               |
| 새 타입(J-Type) 추가 | 파서 함수 + OPERANDS 항목 + switch case 추가  | 중간 클래스 하나                          |

## 분석

### FP가 더 나은 점

- **선언적 전체상.** INSTRUCTION_SET 하나를 보면 모든 명령어의 데이터와
  execute가 한 눈에 보인다. OOP는 10개 클래스 파일을 돌아다녀야 한다.
- **execute가 값이다.** `arithR((a, b) => a + b, "+")`처럼 함수를 합성해서
  execute를 선언적으로 조립한다. OOP의
  `this.arithExecute(ctx, (a,b) => a+b, "+")` 는 같은 일을 하지만 호출처에서만
  보이고, 정의가 상위 클래스에 숨는다.
- **상속 추적이 없다.** `parseR`이 어디서 오는지 알려면 FP는 import를 따라가면
  끝이고, OOP는 `this.parseR` → `RType` → `Instruction`으로 클래스 체인을
  거슬러야 한다.

### OOP가 더 나은 점

- **메서드 바인딩.** `inst.disassemble(ir)` vs `disassemble(inst, ir)`. 호출부가
  깔끔하고, inst가 자신의 행위를 알고 있다.
- **캡슐화 경계.** `parseR`은 R-Type 내부 구현인데, FP에서는 모듈 스코프에
  노출된다. OOP의 `protected`가 "이건 내부용"이라는 의도를 표현한다.
- **새 타입 추가가 국소적.** J-Type을 추가할 때 OOP는 중간 클래스 하나를 만들면
  끝이다. FP는 assemble/disassemble/등 모든 switch에 case를 추가해야 한다
  (Expression Problem).

### 이 케이스의 특성

- assemble/disassemble은 **타입에만 의존**하고 명령어별 차이가 없다. OOP에서도
  구체 클래스가 override하지 않고 중간 클래스의 것을 그대로 쓴다. 이 구조에서는
  FP의 switch든 OOP의 상속이든 표현력 차이가 크지 않다.
- execute만 명령어마다 다르다. 결국 핵심 다형성은 **함수 하나**다. 이걸 위해
  클래스 계층을 세울지, 함수 필드 하나로 처리할지의 문제.
- 새 타입 추가(J-Type 등)보다 **새 명령어 추가**가 훨씬 빈번하다. 이 방향에서는
  둘 다 비슷하게 쉽다.
