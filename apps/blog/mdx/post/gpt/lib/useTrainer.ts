import { useSyncExternalStore } from "react";
import type { TrainerState, TrainerStore } from "./trainerStore";
import { trainerStore } from "./trainerStore";

export function useTrainer(store: TrainerStore = trainerStore): TrainerState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
