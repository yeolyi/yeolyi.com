import type { GPTConfig, TrainConfig } from "./config";

export type MainToWorker =
  | {
      type: "init";
      corpusText: string;
      model?: Partial<Omit<GPTConfig, "vocabSize">>;
      train?: Partial<TrainConfig>;
    }
  | { type: "start" }
  | { type: "pause" }
  | {
      type: "generate";
      prompt: string;
      temperature: number;
      maxTokens: number;
    }
  | { type: "loadWeights"; header: CheckpointHeader; buffer: ArrayBuffer }
  | { type: "exportWeights" }
  | { type: "attention"; prompt: string; layer: number };

export type WorkerToMain =
  | {
      type: "ready";
      backend: string;
      vocabSize: number;
      paramCount: number;
    }
  | {
      type: "progress";
      iter: number;
      loss: number;
      valLoss?: number;
      itPerSec: number;
      tokensSeen: number;
    }
  | { type: "sampleText"; text: string; iter: number }
  | { type: "token"; char: string }
  | { type: "generateDone"; text: string }
  | { type: "weights"; header: CheckpointHeader; buffer: ArrayBuffer }
  | {
      type: "attentionResult";
      /** [head][queryPos][keyPos], 각 행 합 1 */
      weights: number[][][];
      /** 자모 단위 토큰 문자열 */
      tokens: string[];
      layer: number;
    }
  | { type: "error"; message: string };

export interface CheckpointHeader {
  version: 1;
  config: GPTConfig;
  vocab: string[];
  /** flattenParams 순서의 [이름, shape] 목록 */
  tensors: [string, number[]][];
  /** 학습 이력 (표시용) */
  iter: number;
}
