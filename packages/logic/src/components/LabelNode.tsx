import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import NameTag from "./NameTag";
import { TargetHandle } from "./TargetHandle";
import type { NodeProps } from "./type";

export const LabelNode = (props: NodeProps<"label">) => {
  const { atoms } = props.data;

  const out = useAtomValue(atoms.outputAtoms.out);
  useAtom(atoms.effectAtom);

  return (
    <div
      className={clsx(
        "border-foreground relative flex h-10 w-10 items-center justify-center border-2",
        out === true ? "bg-foreground" : "bg-background",
        props.selected && "outline-foreground outline-1",
      )}
    >
      <TargetHandle id="in" top="50%" />
      {/* 배경 채움에 맞춰 반전 — 1(bg-foreground)=흰 텍스트, 0(bg-background)=진 텍스트. */}
      <p
        className={clsx(
          "font-mono text-2xl",
          out === true ? "text-background" : "text-foreground",
        )}
      >
        {out === true ? 1 : out === false ? 0 : ""}
      </p>
      <NameTag atom={atoms.outputAtoms.label} />
    </div>
  );
};
