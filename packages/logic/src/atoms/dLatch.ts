import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { PROPAGATION_DELAY_MS } from "../constants";
import type {
  NodeAtoms,
  NodeCreator,
  OutputAtom,
  OutputValue,
} from "../model/type";

// 상태를 가지는 노드(래치)라 조합 논리 팩토리를 쓰지 않는다.
type DLatchAtoms = NodeAtoms<"d" | "e", "q" | "qBar", true>;

export const createDLatchAtoms: NodeCreator<DLatchAtoms> = () => {
  const dAtom = atom<OutputAtom | null>(null);
  const eAtom = atom<OutputAtom | null>(null);

  const qAtom = atom<OutputValue>(false);
  const qBarAtom = atom<OutputValue>(true);

  const effectAtom = atomEffect((get, set) => {
    const dInput = get(dAtom);
    const eInput = get(eAtom);
    if (dInput === null || eInput === null) return;

    const eValue = get(eInput);
    const dValue = get(dInput);
    if (dValue === null || eValue === null) return;

    if (!eValue) return;

    const timeoutId = setTimeout(() => {
      const currentQ = get(qAtom);
      if (currentQ !== dValue) {
        set.recurse(qAtom, dValue);
        set.recurse(qBarAtom, !dValue);
      }
    }, PROPAGATION_DELAY_MS);

    return () => clearTimeout(timeoutId);
  });

  return {
    inputAtoms: {
      d: dAtom,
      e: eAtom,
    },
    outputAtoms: {
      q: qAtom,
      qBar: qBarAtom,
    },
    effectAtom,
  };
};
