import { create } from "zustand";
import { createStoreContext } from "./createStoreContext";

export type State = string;

export const INITIAL_STATE = "q0";
const EMPTY_TAPE_SYMBOL = "_";
const HALT_STATE = "q_halt";

export type TapeSymbol = string;
type Direction = "L" | "R" | "N";

type Rule = {
  newState: State;
  newSymbol: TapeSymbol;
  direction: Direction;
};

export type Rules = Record<State, Partial<Record<TapeSymbol, Rule>>>;

const parseRulesFromCSV = (csv: string): Rules => {
  const rules: Rules = {};
  const lines = csv
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 5) continue;
    const [currentState, readSymbol, newState, writeSymbol, direction] = parts;

    if (!rules[currentState]) {
      rules[currentState] = {};
    }
    rules[currentState][readSymbol] = {
      newState,
      newSymbol: writeSymbol,
      // CSV의 "L"/"R" 외 토큰("N", "_")은 전부 제자리(N)로 정규화한다
      direction: direction === "L" || direction === "R" ? direction : "N",
    };
  }
  return rules;
};

type TuringMachineState = {
  tape: TapeSymbol[];
  headIdx: number;
  state: State;
  rules: Rules;
  isHalted: boolean;
};

type TuringMachineActions = {
  step: () => void;
  setTapeCell: (idx: number, symbol: TapeSymbol) => void;
  initialize: (
    rulesCsv: string,
    state: State,
    tape: TapeSymbol[],
    headIdx: number,
  ) => void;
};

const turingMachineStore = () =>
  create<TuringMachineState & TuringMachineActions>((set, get) => ({
    tape: [],
    headIdx: 0,
    state: INITIAL_STATE,
    rules: {},
    isHalted: false,
    setTapeCell: (idx, symbol) => {
      const tape = [...get().tape];
      tape[idx] = symbol;
      set({ tape });
    },
    initialize: (rulesCsv, state, tape, headIdx) => {
      set({
        rules: parseRulesFromCSV(rulesCsv),
        tape,
        headIdx,
        state,
        isHalted: false,
      });
    },
    step: () => {
      const { state: currentState, headIdx, tape, rules } = get();

      if (
        currentState === HALT_STATE ||
        headIdx < 0 ||
        headIdx >= tape.length
      ) {
        set({ isHalted: true });
        return;
      }

      const currentSymbol = tape[headIdx];
      const rule = rules[currentState]?.[currentSymbol];

      if (!rule) {
        set({ isHalted: true });
        return;
      }

      let newTape: TapeSymbol[];
      let nextHeadIdx: number;
      if (headIdx === 0 && rule.direction === "L") {
        newTape = [EMPTY_TAPE_SYMBOL, ...tape];
        nextHeadIdx = 0;
      } else if (headIdx === tape.length - 1 && rule.direction === "R") {
        newTape = [...tape, EMPTY_TAPE_SYMBOL];
        nextHeadIdx = tape.length;
      } else {
        newTape = [...tape];
        nextHeadIdx = headIdx + { L: -1, R: 1, N: 0 }[rule.direction];
      }

      newTape[headIdx] = rule.newSymbol;
      set({
        tape: newTape,
        state: rule.newState,
        headIdx: nextHeadIdx,
      });
    },
  }));

export const [TuringMachineProvider, useTuringMachineStore] =
  createStoreContext(turingMachineStore);
