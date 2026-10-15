import { Handle, Position } from "@xyflow/react";
import clsx from "clsx";
import { useAtom } from "jotai";
import { RIGHT_HANDLE_STYLE } from "../constants";
import NameTag from "./NameTag";
import type { NodeProps } from "./type";

export const BooleanNode = (props: NodeProps<"number">) => {
  const { atoms } = props.data;
  const [out, setOut] = useAtom(atoms.outputAtoms.out);

  return (
    <div className="relative">
      {/* 칸 크기(40px)는 노드 배치·핸들 위치가 기대는 값이라 그대로 둔다. 채움이 곧 값(1 = 채움)이라
          호버해도 색을 바꾸지 않는다(반전하면 1 이 0 처럼 보인다. 체크박스와 같다). 초점은 주황 테두리,
          누르면 내용물이 1px 내려간다. */}
      <button
        className={clsx(
          "border-foreground focus-border press-down relative flex h-10 w-10 cursor-pointer items-center justify-center border-2",
          out
            ? "bg-foreground text-background"
            : "bg-background text-foreground",
          props.selected && "outline-foreground outline-1",
        )}
        onClick={() => setOut(!out)}
        type="button"
      >
        <p className="font-mono text-2xl">{out ? 1 : 0}</p>
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ ...RIGHT_HANDLE_STYLE, top: "50%" }}
        />
      </button>
      <NameTag atom={atoms.outputAtoms.label} />
    </div>
  );
};
