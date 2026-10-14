import { createBooleanAtoms } from "./boolean";
import { createCombinational } from "./combinational";
import { createDLatchAtoms } from "./dLatch";
import { createLabelAtoms } from "./label";

// and/nand/or/nor: input 값 하나가 null인걸 의도적으로 허용 (false 취급)
// 이를 통해 피드백 구조를 허용
const createNandAtoms = createCombinational(
  ["in1", "in2"],
  ["out"],
  ({ in1, in2 }) => ({ out: !(in1 && in2) }),
);

const createAndAtoms = createCombinational(
  ["in1", "in2"],
  ["out"],
  ({ in1, in2 }) => ({ out: Boolean(in1 && in2) }),
);

const createOrAtoms = createCombinational(
  ["in1", "in2"],
  ["out"],
  ({ in1, in2 }) => ({ out: Boolean(in1 || in2) }),
);

const createNorAtoms = createCombinational(
  ["in1", "in2"],
  ["out"],
  ({ in1, in2 }) => ({ out: !(in1 || in2) }),
);

const createNotAtoms = createCombinational(["in1"], ["out"], ({ in1 }) => ({
  out: !in1,
}));

// halfAdder/fullAdder/mux/decoder: input 값이 null이면 출력도 미정(null)
const createHalfAdderAtoms = createCombinational(
  ["in1", "in2"],
  ["sum", "carry"],
  ({ in1, in2 }) => {
    if (in1 === null || in2 === null) return { sum: null, carry: null };
    return { sum: in1 !== in2, carry: Boolean(in1 && in2) };
  },
);

const createFullAdderAtoms = createCombinational(
  ["in1", "in2", "cin"],
  ["sum", "cout"],
  ({ in1, in2, cin }) => {
    if (in1 === null || in2 === null || cin === null)
      return { sum: null, cout: null };
    return {
      sum: Boolean(Number(in1) ^ Number(in2) ^ Number(cin)),
      cout: Boolean((in1 && in2) || (in2 && cin) || (cin && in1)),
    };
  },
);

const createMuxAtoms = createCombinational(
  ["d0", "d1", "d2", "d3", "s0", "s1"],
  ["out"],
  ({ d0, d1, d2, d3, s0, s1 }) => {
    if (s0 === null || s1 === null) return { out: null };
    const index = (Number(s1) << 1) | Number(s0);
    const selected = [d0, d1, d2, d3][index];
    return { out: selected === null ? null : Boolean(selected) };
  },
  // 셀렉터만 필수 — 선택되지 않은 데이터 입력은 비어 있어도 된다
  ["s0", "s1"],
);

const createDecoderAtoms = createCombinational(
  ["a0", "a1"],
  ["o0", "o1", "o2", "o3"],
  ({ a0, a1 }) => {
    if (a0 === null || a1 === null)
      return { o0: null, o1: null, o2: null, o3: null };
    const index = (Number(a1) << 1) | Number(a0);
    return {
      o0: index === 0,
      o1: index === 1,
      o2: index === 2,
      o3: index === 3,
    };
  },
);

// 노드 정의 테이블 — [저장 파일의 node.type 키, 표시 이름, atom 생성자].
// 키는 mdx에 임베드된 회로 JSON과의 호환을 위해 절대 바꾸지 않는다.
// 순서는 UI 버튼 순서.
const registryTable = [
  ["number", "0/1", createBooleanAtoms],
  ["label", "Label", createLabelAtoms],
  ["nand", "NAND", createNandAtoms],
  ["and", "AND", createAndAtoms],
  ["or", "OR", createOrAtoms],
  ["not", "NOT", createNotAtoms],
  ["nor", "NOR", createNorAtoms],
  ["halfAdder", "Half Adder", createHalfAdderAtoms],
  ["fullAdder", "Full Adder", createFullAdderAtoms],
  ["dLatch", "D Latch", createDLatchAtoms],
  ["mux", "MUX", createMuxAtoms],
  ["decoder", "Decoder", createDecoderAtoms],
] as const;

type RegistryEntry = (typeof registryTable)[number];

export const registry = Object.fromEntries(
  registryTable.map(([key, , create]) => [key, create]),
) as { [E in RegistryEntry as E[0]]: E[2] };

type Registry = typeof registry;

export const registryKeys = registryTable.map(([key]) => key);

export type RegistryKey = (typeof registryKeys)[number];

export const registryNames = Object.fromEntries(
  registryTable.map(([key, name]) => [key, name]),
) as Record<RegistryKey, string>;

export const isRegistryKey = (key: unknown): key is RegistryKey =>
  typeof key === "string" && registryKeys.includes(key as RegistryKey);

export type RegistryAtoms<T extends RegistryKey = RegistryKey> = ReturnType<
  Registry[T]
>;
