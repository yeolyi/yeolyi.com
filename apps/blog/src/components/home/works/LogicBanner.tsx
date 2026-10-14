import { useState } from "react";

// 반가산기: A·B 가 XOR 로 SUM, AND 로 CARRY 가 된다. A 나 B 칸을 누르면 값이 뒤집히고
// 선과 출력이 바로 따라 바뀐다(시뮬레이터의 스위치처럼).
// 1 인 선은 굵은 잉크, 0 인 선은 옅은 점선. 잉크는 currentColor 라 어두운 모드에서도 맞는다.
// 회로가 그려진 범위만(여백 없이) 잡아 좁은 화면에서도 글자가 덜 작아지게 한다.
const VB = "12 8 356 128";
const BOX = 28;
const INPUTS = { A: { x: 20, y: 31 }, B: { x: 20, y: 91 } } as const;
const OUTPUTS = { SUM: { x: 332, y: 31 }, CARRY: { x: 332, y: 91 } } as const;
type Input = keyof typeof INPUTS;

function wire(on: boolean) {
  return on
    ? { stroke: "currentColor", strokeWidth: 2.2 }
    : {
        stroke: "var(--color-muted-foreground)",
        strokeWidth: 1.2,
        strokeDasharray: "4 3",
      };
}

function Box({
  x,
  y,
  label,
  on,
  onToggle,
}: {
  x: number;
  y: number;
  label: string;
  on: boolean;
  onToggle?: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 배너 전체가 aria-hidden 인 장식이다. 이동은 아래 이름 링크가 한다
    <g onClick={onToggle} className={onToggle ? "cursor-pointer" : undefined}>
      {/* 누를 자리는 칸보다 둘레 8 만큼 넉넉히 */}
      {onToggle && (
        <rect
          x={x - 8}
          y={y - 8}
          width={BOX + 16}
          height={BOX + 16}
          fill="transparent"
        />
      )}
      <text
        x={x + BOX / 2}
        y={y - 7}
        textAnchor="middle"
        fontSize={10}
        fill="currentColor"
      >
        {label}
      </text>
      <rect
        x={x}
        y={y}
        width={BOX}
        height={BOX}
        fill={on ? "currentColor" : "var(--color-background)"}
        stroke="currentColor"
        strokeWidth={1.2}
      />
      <text
        x={x + BOX / 2}
        y={y + BOX / 2 + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={on ? "var(--color-background)" : "currentColor"}
      >
        {on ? 1 : 0}
      </text>
    </g>
  );
}

export default function LogicBanner() {
  const [v, setV] = useState({ A: true, B: true });
  const toggle = (k: Input) => () =>
    setV((prev) => ({ ...prev, [k]: !prev[k] }));

  const sum = v.A !== v.B;
  const carry = v.A && v.B;

  return (
    <div className="text-foreground absolute inset-0">
      <svg
        viewBox={VB}
        className="block h-full w-full font-mono"
        aria-hidden="true"
      >
        <g fill="none" strokeLinejoin="miter">
          <path d="M48 45 H110 V37.5 H186" {...wire(v.A)} />
          <path d="M110 45 V98 H186" {...wire(v.A)} />
          <path d="M48 105 H130 V58 H186" {...wire(v.B)} />
          <path d="M130 105 V113 H186" {...wire(v.B)} />
          <path d="M255 45 H332" {...wire(sum)} />
          <path d="M247.5 105 H332" {...wire(carry)} />
        </g>

        <g
          stroke="currentColor"
          strokeWidth={1.4}
          fill="var(--color-background)"
        >
          {/* XOR: OR 몸통 + 뒤쪽 곡선 하나 */}
          <path d="M180 23 Q228 23 255 45 Q228 68 180 68 Q194 45 180 23 Z" />
          <path d="M173 23 Q187 45 173 68" fill="none" />
          {/* AND */}
          <path d="M180 82.5 H225 A22.5 22.5 0 0 1 225 127.5 H180 Z" />
        </g>
        <g
          fontSize={11}
          fontWeight={700}
          fill="currentColor"
          textAnchor="middle"
        >
          <text x={214} y={49}>
            XOR
          </text>
          <text x={208} y={109}>
            AND
          </text>
        </g>

        <Box {...INPUTS.A} label="A" on={v.A} onToggle={toggle("A")} />
        <Box {...INPUTS.B} label="B" on={v.B} onToggle={toggle("B")} />
        <Box {...OUTPUTS.SUM} label="SUM" on={sum} />
        <Box {...OUTPUTS.CARRY} label="CARRY" on={carry} />
      </svg>
    </div>
  );
}
