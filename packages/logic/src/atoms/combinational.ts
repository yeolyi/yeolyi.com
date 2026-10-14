import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { PROPAGATION_DELAY_MS } from "../constants";
import type {
  NodeAtoms,
  NodeCreator,
  OutputAtom,
  OutputValue,
} from "../model/type";

// 조합 논리 노드 공통 골격:
// 입력 키마다 연결 atom, 순수 계산 derived atom, 출력 키마다 딜레이된 출력 atom,
// PROPAGATION_DELAY_MS 뒤에 출력을 반영하는 effect atom.
//
// evaluate는 입력의 "값"을 그대로 받는다 — 값이 null일 때의 처리(false 취급 vs
// null 전파)는 게이트마다 다르므로 evaluate 쪽 책임이다.
//
// requiredKeys에 없는 입력은 연결이 비어 있어도 출력을 미정으로 만들지 않고
// 값 null로 evaluate에 전달된다 (mux의 선택되지 않은 데이터 입력용).
export const createCombinational = <I extends string, O extends string>(
  inputKeys: readonly I[],
  outputKeys: readonly O[],
  evaluate: (values: Record<I, OutputValue>) => Record<O, boolean | null>,
  requiredKeys: readonly I[] = inputKeys,
): NodeCreator<NodeAtoms<I, O, true>> => {
  return () => {
    const inputAtoms = {} as NodeAtoms<I, O, true>["inputAtoms"];
    for (const key of inputKeys) {
      inputAtoms[key] = atom<OutputAtom | null>(null);
    }

    // 필수 입력의 연결이 하나라도 없으면 미정(null)
    const resultAtom = atom<Record<O, boolean | null> | null>((get) => {
      const values = {} as Record<I, OutputValue>;
      for (const key of inputKeys) {
        const input = get(inputAtoms[key]);
        if (input === null) {
          if (requiredKeys.includes(key)) return null;
          values[key] = null;
        } else {
          values[key] = get(input);
        }
      }
      return evaluate(values);
    });

    const outputAtoms = {} as NodeAtoms<I, O, true>["outputAtoms"];
    for (const key of outputKeys) {
      outputAtoms[key] = atom<OutputValue>(null);
    }

    const effectAtom = atomEffect((get, set) => {
      const result = get(resultAtom);

      const id = setTimeout(() => {
        for (const key of outputKeys) {
          set.recurse(outputAtoms[key], result === null ? null : result[key]);
        }
      }, PROPAGATION_DELAY_MS);

      return () => clearTimeout(id);
    });

    return { inputAtoms, outputAtoms, effectAtom };
  };
};
