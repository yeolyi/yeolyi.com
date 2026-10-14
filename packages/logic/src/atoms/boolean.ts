import { atom } from "jotai";
import type {
  NodeAtoms,
  NodeCreator,
  OutputValue,
} from "../model/type";

type BooleanAtoms = NodeAtoms<never, "out" | "label", false>;

export const createBooleanAtoms: NodeCreator<BooleanAtoms> = () => {
  const outAtom = atom<OutputValue>(false);
  const labelAtom = atom<OutputValue>(null);

  return {
    inputAtoms: {},
    outputAtoms: { out: outAtom, label: labelAtom },
    effectAtom: undefined,
  };
};
