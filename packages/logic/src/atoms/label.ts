import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { PROPAGATION_DELAY_MS } from "../constants";
import type {
  NodeAtoms,
  NodeCreator,
  OutputAtom,
  OutputValue,
} from "../model/type";

// label 출력은 effect가 아니라 NameTag가 직접 쓰는 값이라 팩토리를 쓰지 않는다.
type LabelAtoms = NodeAtoms<"in", "label" | "out", true>;

export const createLabelAtoms: NodeCreator<LabelAtoms> = () => {
  const inAtom = atom<OutputAtom | null>(null);

  const labelAtom = atom<OutputValue>(null);
  const outAtom = atom<OutputValue>(null);

  const outEffect = atomEffect((get, set) => {
    const in1 = get(inAtom);
    // 연결이 끊기면 마지막 값을 유지하지 않고 미정(null)으로 되돌린다
    const value = in1 === null ? null : get(in1);

    const id = setTimeout(() => {
      set.recurse(outAtom, value);
    }, PROPAGATION_DELAY_MS);

    return () => clearTimeout(id);
  });

  return {
    inputAtoms: {
      in: inAtom,
    },
    outputAtoms: {
      label: labelAtom,
      out: outAtom,
    },
    effectAtom: outEffect,
  };
};
