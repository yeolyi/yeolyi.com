import { Handle, Position } from "@xyflow/react";
import clsx from "clsx";
import { useAtom } from "jotai";
import { RIGHT_HANDLE_STYLE } from "../constants";
import { TargetHandle } from "./TargetHandle";
import type { NodeProps } from "./type";

type BoxKey = "mux" | "decoder" | "dLatch" | "fullAdder" | "halfAdder";

// 박스형 노드 공통 셸 — 제목·크기·핸들 배치만 다르다.
type BoxHandleConfig = {
  id: string;
  top: string;
  label?: string;
  // 기본은 핸들 높이에 정렬, "top"/"bottom"은 모서리에 고정
  labelAt?: "top" | "bottom";
  labelClassName?: string;
};

type BoxConfig = {
  title: string;
  // h-* w-* 크기 클래스
  sizeClassName: string;
  inputs: BoxHandleConfig[];
  outputs: BoxHandleConfig[];
};

const HandleLabel = ({
  handle,
  side,
}: {
  handle: BoxHandleConfig;
  side: "left" | "right";
}) => {
  if (!handle.label) return null;

  const sideClass = side === "left" ? "left-1" : "right-1";
  const colorClass = handle.labelClassName ?? "text-foreground";

  if (handle.labelAt) {
    return (
      <p
        className={clsx(
          "absolute font-mono",
          sideClass,
          handle.labelAt === "top" ? "top-1" : "bottom-1",
          colorClass,
        )}
      >
        {handle.label}
      </p>
    );
  }

  return (
    <p
      className={clsx(
        "absolute -translate-y-1/2 font-mono",
        sideClass,
        colorClass,
      )}
      style={{ top: handle.top }}
    >
      {handle.label}
    </p>
  );
};

const createBoxNode = (config: BoxConfig) => {
  const BoxNode = ({ data, selected }: NodeProps<BoxKey>) => {
    const { atoms } = data;
    useAtom(atoms.effectAtom);

    return (
      <div
        className={clsx(
          "border-foreground bg-background relative flex items-center justify-center border-2",
          config.sizeClassName,
          selected && "outline-foreground outline-1",
        )}
      >
        {config.inputs.map((handle) => (
          <TargetHandle key={handle.id} id={handle.id} top={handle.top} />
        ))}

        {config.outputs.map((handle) => (
          <Handle
            key={handle.id}
            type="source"
            position={Position.Right}
            id={handle.id}
            style={{ ...RIGHT_HANDLE_STYLE, top: handle.top }}
          />
        ))}

        {config.inputs.map((handle) => (
          <HandleLabel key={handle.id} handle={handle} side="left" />
        ))}
        {config.outputs.map((handle) => (
          <HandleLabel key={handle.id} handle={handle} side="right" />
        ))}

        <p className="text-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono">
          {config.title}
        </p>
      </div>
    );
  };

  return BoxNode;
};

export const MuxNode = createBoxNode({
  title: "MUX",
  sizeClassName: "h-60 w-32",
  inputs: [
    { id: "d0", top: "14%", label: "D0" },
    { id: "d1", top: "28%", label: "D1" },
    { id: "d2", top: "43%", label: "D2" },
    { id: "d3", top: "57%", label: "D3" },
    {
      id: "s0",
      top: "71%",
      label: "S0",
      labelClassName: "text-muted-foreground",
    },
    {
      id: "s1",
      top: "86%",
      label: "S1",
      labelClassName: "text-muted-foreground",
    },
  ],
  outputs: [{ id: "out", top: "50%", label: "OUT", labelAt: "top" }],
});

export const DecoderNode = createBoxNode({
  title: "DECODER",
  sizeClassName: "h-40 w-32",
  inputs: [
    { id: "a0", top: "33%", label: "A0" },
    { id: "a1", top: "67%", label: "A1" },
  ],
  outputs: [
    { id: "o0", top: "20%", label: "O0" },
    { id: "o1", top: "40%", label: "O1" },
    { id: "o2", top: "60%", label: "O2" },
    { id: "o3", top: "80%", label: "O3" },
  ],
});

export const DLatchNode = createBoxNode({
  title: "D LATCH",
  sizeClassName: "h-32 w-32",
  inputs: [
    { id: "d", top: "25%", label: "D", labelAt: "top" },
    { id: "e", top: "75%", label: "E", labelAt: "bottom" },
  ],
  outputs: [
    { id: "q", top: "25%", label: "Q", labelAt: "top" },
    { id: "qBar", top: "75%", label: "Q_BAR", labelAt: "bottom" },
  ],
});

export const FullAdderNode = createBoxNode({
  title: "FULL ADDER",
  sizeClassName: "h-32 w-36",
  inputs: [
    { id: "cin", top: "25%", label: "CIN" },
    { id: "in1", top: "50%", label: "IN1" },
    { id: "in2", top: "75%", label: "IN2" },
  ],
  outputs: [
    { id: "sum", top: "25%", label: "SUM", labelAt: "top" },
    { id: "cout", top: "75%", label: "CARRY", labelAt: "bottom" },
  ],
});

export const HalfAdderNode = createBoxNode({
  title: "HALF ADDER",
  sizeClassName: "h-32 w-32",
  inputs: [
    { id: "in1", top: "25%" },
    { id: "in2", top: "75%" },
  ],
  outputs: [
    { id: "sum", top: "25%", label: "SUM", labelAt: "top" },
    { id: "carry", top: "75%", label: "CARRY", labelAt: "bottom" },
  ],
});
