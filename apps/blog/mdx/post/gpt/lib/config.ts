export interface GPTConfig {
  nLayer: number;
  nHead: number;
  nEmbd: number;
  blockSize: number;
  vocabSize: number;
}

export interface TrainConfig {
  batchSize: number;
  learningRate: number;
  /** val loss 측정 주기 (iter). 0이면 측정 안 함 */
  evalInterval: number;
  /** 학습 중 자동 샘플 생성 주기 (iter) */
  sampleInterval: number;
  /** 코퍼스 뒤쪽에서 val로 떼어둘 비율 */
  valFraction: number;
  /** iter 사이 쉬는 시간(ms). GPU를 독점하지 않아 본문 스크롤이 부드러워진다 */
  interIterDelayMs: number;
}

export const DEFAULT_MODEL: Omit<GPTConfig, "vocabSize"> = {
  nLayer: 6,
  nHead: 6,
  nEmbd: 192,
  blockSize: 256,
};

export const DEFAULT_TRAIN: TrainConfig = {
  // 배치가 크면 GPU 디스패치 한 번이 길어져 화면 합성까지 밀린다.
  // 수렴은 조금 느려져도 렉이 없는 쪽을 택한다.
  batchSize: 32,
  learningRate: 1e-3,
  evalInterval: 200,
  sampleInterval: 50,
  valFraction: 0.05,
  interIterDelayMs: 60,
};
