import { Handle, Position } from "@xyflow/react";
import { useAtom } from "jotai";
import { useId } from "react";
import { TargetHandle } from "./TargetHandle";
import type { NodeProps } from "./type";
import { RIGHT_HANDLE_STYLE } from "../constants";

type GateKey = "and" | "nand" | "or" | "nor" | "not";

// SVG 게이트 노드 공통 셸 — 게이트마다 도형과 입력 핸들 위치만 다르다.
type GateConfig = {
  title: string;
  width: number;
  height: number;
  shapes: (
    | { kind: "path"; d: string }
    | { kind: "circle"; cx: number; cy: number; r: number }
  )[];
  inputs: { id: string; top: string }[];
  /** 몸통 안에 쓸 게이트 이름과 그 중심 x. 없으면 이름을 그리지 않는다. */
  label?: { text: string; x: number };
};

const createGateNode = (config: GateConfig) => {
  const GateNode = ({ data, selected }: NodeProps<GateKey>) => {
    const { atoms } = data;

    useAtom(atoms.effectAtom);

    const titleId = useId();
    // 값은 선과 출력 상자가 보여준다. 게이트는 늘 바탕색으로 채워 이름이 읽히게 한다.
    const strokeWidth = selected ? 3 : 2;

    return (
      <div className="text-foreground relative">
        {/* overflow-visible — 게이트 도형이 viewBox 경계에 붙어 있어, 기본
           overflow:hidden 이면 stroke 의 바깥 절반이 잘려 변마다 두께가
           달라 보인다. 잘림만 없애 테두리를 균일하게 한다. */}
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
          className="overflow-visible"
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>{config.title}</title>
          {config.shapes.map((shape) =>
            shape.kind === "path" ? (
              <path
                key={shape.d}
                d={shape.d}
                className="fill-background"
                stroke="currentColor"
                strokeWidth={strokeWidth}
              />
            ) : (
              <circle
                key={`${shape.cx},${shape.cy}`}
                cx={shape.cx}
                cy={shape.cy}
                r={shape.r}
                className="fill-background"
                stroke="currentColor"
                strokeWidth={strokeWidth}
              />
            ),
          )}
          {config.label && (
            <text
              x={config.label.x}
              y={config.height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-current font-mono text-xl"
              aria-hidden
            >
              {config.label.text}
            </text>
          )}
        </svg>
        {config.inputs.map((input) => (
          <TargetHandle key={input.id} id={input.id} top={input.top} />
        ))}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ ...RIGHT_HANDLE_STYLE, top: "50%" }}
        />
      </div>
    );
  };

  return GateNode;
};

// AND 게이트 — 뒤는 평평, 앞은 반원(D자). viewBox 96×64, 반원 반지름 32.
const AND_PATH = "M0,0 L64,0 A32,32 0 0 1 64,64 L0,64 Z";
const OR_PATH = "M0,0 Q85,0 96,32 Q85,64 0,64 Q8,32 0,0 Z";

const TWO_INPUTS = [
  { id: "in1", top: "25%" },
  { id: "in2", top: "75%" },
];

export const AndNode = createGateNode({
  title: "AND Gate",
  width: 96,
  height: 64,
  shapes: [{ kind: "path", d: AND_PATH }],
  inputs: TWO_INPUTS,
  label: { text: "AND", x: 44 },
});

// NAND — AND(D자) + 출력 반전 버블. viewBox 112×64(버블 포함).
export const NandNode = createGateNode({
  title: "NAND Gate",
  width: 112,
  height: 64,
  shapes: [
    { kind: "path", d: AND_PATH },
    { kind: "circle", cx: 104, cy: 32, r: 8 },
  ],
  inputs: TWO_INPUTS,
  label: { text: "NAND", x: 44 },
});

export const OrNode = createGateNode({
  title: "OR Gate",
  width: 96,
  height: 64,
  shapes: [{ kind: "path", d: OR_PATH }],
  inputs: TWO_INPUTS,
  label: { text: "OR", x: 46 },
});

export const NorNode = createGateNode({
  title: "NOR Gate",
  width: 104,
  height: 64,
  shapes: [
    { kind: "path", d: OR_PATH },
    { kind: "circle", cx: 96, cy: 32, r: 8 },
  ],
  inputs: TWO_INPUTS,
  label: { text: "NOR", x: 46 },
});

// NOT 은 몸통(삼각형)이 작아 이름을 넣으면 테두리에 닿는다. 모양만으로 알아보므로 생략.
export const NotNode = createGateNode({
  title: "NOT Gate",
  width: 48,
  height: 40,
  shapes: [
    { kind: "path", d: "M0 0 L40 20 L0 40 Z" },
    { kind: "circle", cx: 40, cy: 20, r: 8 },
  ],
  inputs: [{ id: "in1", top: "50%" }],
});
