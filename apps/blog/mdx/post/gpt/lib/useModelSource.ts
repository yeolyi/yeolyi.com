import { useEffect, useState } from "react";
import type { TrainerState, TrainerStore } from "./trainerStore";
import { pretrainedStore, trainerStore } from "./trainerStore";
import { useTrainer } from "./useTrainer";

export type ModelSource = "pretrained" | "mine";

export const MODEL_OPTIONS = [
  { value: "pretrained", label: "사전학습 모델" },
  { value: "mine", label: "내가 학습한 모델" },
];

/**
 * 모델 소스 선택 훅. 컴포넌트마다 독립적으로 사전학습/직접 학습 모델을 고른다.
 * 사전학습을 고르면 체크포인트를 (아직이면) 로드한다.
 * `fixed`를 주면 소스가 고정된다 (예: 학습 절 이전이라 항상 "pretrained").
 */
export function useModelSource(fixed?: ModelSource): {
  source: ModelSource;
  setSource: (s: ModelSource) => void;
  store: TrainerStore;
  state: TrainerState;
  /** 선택된 모델이 사용 가능한 상태인지 */
  ready: boolean;
  hint: string | null;
} {
  const [selected, setSource] = useState<ModelSource>("pretrained");
  const source = fixed ?? selected;
  const store = source === "pretrained" ? pretrainedStore : trainerStore;
  const state = useTrainer(store);

  useEffect(() => {
    if (source === "pretrained") void pretrainedStore.loadPretrained();
  }, [source]);

  const ready = state.paramCount > 0 && state.status !== "initializing";
  let hint: string | null = null;
  if (source === "pretrained" && !ready) hint = "사전학습 모델 로드 중...";
  if (source === "mine" && state.paramCount === 0)
    hint = "위 학습 절에서 학습을 시작하면 사용할 수 있다.";
  if (state.error) hint = `오류: ${state.error}`;
  return { source, setSource, store, state, ready, hint };
}
