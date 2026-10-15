// 예제 회로 목록. 슬러그(주소 /examples/<slug>)·제목·Flow 저장키(id)·데이터 로더를 한 곳에 모은다.
// data 는 슬러그별 동적 import 라 회로마다 별도 청크로 나뉜다(필요한 것만 로드).
// 반가산기·전가산기는 블로그 CS 글(6·7장)의 회로를 복사해 둔 것이다.
export const EXAMPLES = [
  {
    slug: "half-adder",
    title: "Half Adder",
    label: "반가산기",
    hint: "왼쪽 A·B 스위치를 클릭해 두 비트를 더해보세요. 결과는 오른쪽 Sum·Carry에 나타납니다.",
    id: "logic-gate-simulator",
    load: () => import("./assets/half-adder.json"),
  },
  {
    slug: "full-adder",
    title: "Full Adder",
    label: "전가산기",
    hint: "A·B·Cin 스위치를 클릭해 세 비트를 더해보세요. 결과는 SUM·Cout에 나타납니다.",
    id: "full-adder",
    load: () => import("./assets/full-adder.json"),
  },
  {
    slug: "seven-segment",
    title: "7-Segment Decoder",
    label: "7-세그먼트 디코더",
    hint: "왼쪽 8·4·2·1 스위치로 2진수(0~9)를 만들면 오른쪽 세그먼트에 숫자가 그려집니다.",
    id: "seven-segment",
    load: () => import("./assets/seven-segment.json"),
  },
  {
    slug: "fibonacci-8bit",
    title: "Fibonacci Calculator (8-bit)",
    label: "피보나치 8-bit",
    hint: "AND·OR·NOT 게이트와 D래치로 만든 피보나치 계산기입니다. CLK 스위치를 켰다 끌 때마다 bit7–bit0이 다음 피보나치 수(2진수)로 바뀝니다.",
    id: "fibonacci-8bit-dff",
    load: () => import("./assets/fibonacci-8bit-dff.json"),
    // 선이 빽빽해 직각선은 세로 줄기가 겹쳐 읽을 수 없다.
    edgeStyle: "bezier",
  },
  {
    slug: "fibonacci-8bit-nand",
    title: "Fibonacci Calculator (8-bit, NAND)",
    label: "피보나치 8-bit (NAND)",
    hint: "NAND 게이트만으로 만든 피보나치 계산기입니다. CLK 스위치를 켰다 끌 때마다 bit7–bit0이 다음 피보나치 수(2진수)로 바뀝니다.",
    id: "fibonacci-8bit",
    load: () => import("./assets/fibonacci-8bit.json"),
    // 선이 빽빽해 직각선은 세로 줄기가 겹쳐 읽을 수 없다.
    edgeStyle: "bezier",
  },
] as const;

export type ExampleSlug = (typeof EXAMPLES)[number]["slug"];
export type Example = (typeof EXAMPLES)[number];

export const EXAMPLE_BY_SLUG = Object.fromEntries(
  EXAMPLES.map((e) => [e.slug, e]),
) as Record<ExampleSlug, Example>;
