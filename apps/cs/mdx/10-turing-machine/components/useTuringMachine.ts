import { useEffect, useState } from "react";
import {
  INITIAL_STATE,
  type TapeSymbol,
  useTuringMachineStore,
} from "./turingMachineStore";

export const useTuringMachine = (
  initialTape: TapeSymbol[],
  initialHeadIdx: number,
  rulesCsv: string,
) => {
  const {
    tape,
    headIdx,
    state,
    isHalted,
    step,
    initialize,
    rules,
    setTapeCell,
  } = useTuringMachineStore();
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const reset = (newRulesCsv?: string) => {
    initialize(
      newRulesCsv || rulesCsv,
      INITIAL_STATE,
      initialTape,
      initialHeadIdx,
    );
    setHasStarted(false);
  };

  useEffect(() => {
    initialize(rulesCsv, INITIAL_STATE, initialTape, initialHeadIdx);
    setHasStarted(false);
  }, [initialize, rulesCsv, initialTape, initialHeadIdx]);

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      if (isHalted) {
        setIsRunning(false);
        clearInterval(id);
      } else {
        step();
      }
    }, 100);

    return () => clearInterval(id);
  }, [isHalted, isRunning, step]);

  return {
    tape,
    headIdx,
    state,
    isRunning,
    rules,
    isHalted,
    hasStarted,
    setTapeCell,
    step: () => {
      setHasStarted(true);
      step();
    },
    play: () => {
      if (!isHalted) {
        setHasStarted(true);
        setIsRunning(true);
      }
    },
    pause: () => setIsRunning(false),
    reset,
  };
};
