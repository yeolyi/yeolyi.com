/**
 * 워커를 감싸는 싱글턴 스토어.
 * 글의 여러 컴포넌트(학습 대시보드, 플레이그라운드, attention 히트맵)가
 * 같은 모델 인스턴스를 공유한다. useSyncExternalStore 로 구독.
 */
import { fetchCheckpoint, loadCheckpoint, saveCheckpoint } from "./checkpoint";
import { getSillokCorpus } from "./corpus";
import type { CheckpointHeader, MainToWorker, WorkerToMain } from "./protocol";

export interface LossPoint {
  iter: number;
  loss: number;
  valLoss?: number;
}

export interface TrainerState {
  status: "idle" | "initializing" | "ready" | "training";
  backend: string;
  corpusName: string;
  corpusChars: number;
  vocabSize: number;
  paramCount: number;
  iter: number;
  itPerSec: number;
  tokensSeen: number;
  lossHistory: LossPoint[];
  samples: { iter: number; text: string }[];
  /** 사전학습 체크포인트가 로드된 상태인지 */
  pretrained: boolean;
  generating: boolean;
  generated: string;
  error: string | null;
}

const initialState: TrainerState = {
  status: "idle",
  backend: "",
  corpusName: "",
  corpusChars: 0,
  vocabSize: 0,
  paramCount: 0,
  iter: 0,
  itPerSec: 0,
  tokensSeen: 0,
  lossHistory: [],
  samples: [],
  pretrained: false,
  generating: false,
  generated: "",
  error: null,
};

type Listener = () => void;

export class TrainerStore {
  private worker: Worker | null = null;
  private state: TrainerState = initialState;
  private listeners = new Set<Listener>();
  // 워커 응답을 기다리는 대기자. 워커가 error 를 보내면 reject 된다
  private readyWaiters: PromiseWithResolvers<void>[] = [];
  private attentionWaiters: PromiseWithResolvers<
    Extract<WorkerToMain, { type: "attentionResult" }>
  >[] = [];
  private weightsWaiters: PromiseWithResolvers<{
    header: CheckpointHeader;
    buffer: ArrayBuffer;
  }>[] = [];
  private corpusText = "";

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = () => this.state;

  private set(patch: Partial<TrainerState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }

  private send(msg: MainToWorker, transfer?: Transferable[]) {
    this.worker?.postMessage(msg, transfer ?? []);
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./trainWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onerror = (e) => {
      this.set({ error: `worker: ${e.message ?? "로드 실패"}` });
      this.rejectWaiters(new Error(e.message ?? "worker 로드 실패"));
    };
    worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data;
      switch (msg.type) {
        case "ready":
          this.set({
            status: "ready",
            backend: msg.backend,
            vocabSize: msg.vocabSize,
            paramCount: msg.paramCount,
            error: null,
          });
          this.readyWaiters.shift()?.resolve();
          break;
        case "progress": {
          let lossHistory = [
            ...this.state.lossHistory,
            { iter: msg.iter, loss: msg.loss, valLoss: msg.valLoss },
          ];
          // 무한 성장 방지: 한계를 넘으면 절반으로 다운샘플
          // (차트 해상도에선 어차피 구분 안 된다)
          if (lossHistory.length > 5000) {
            lossHistory = lossHistory.filter((_, i) => i % 2 === 0);
          }
          this.set({
            iter: msg.iter,
            itPerSec: msg.itPerSec,
            tokensSeen: msg.tokensSeen,
            lossHistory,
          });
          break;
        }
        case "sampleText":
          this.set({
            samples: [
              ...this.state.samples,
              { iter: msg.iter, text: msg.text },
            ],
          });
          break;
        case "token":
          this.set({ generated: this.state.generated + msg.char });
          break;
        case "generateDone":
          this.set({ generating: false, generated: msg.text });
          break;
        case "attentionResult":
          this.attentionWaiters.shift()?.resolve(msg);
          break;
        case "weights":
          this.weightsWaiters.shift()?.resolve({
            header: msg.header,
            buffer: msg.buffer,
          });
          break;
        case "error":
          this.set({ error: msg.message, generating: false });
          this.rejectWaiters(new Error(msg.message));
          break;
      }
    };
    this.worker = worker;
    return worker;
  }

  private rejectWaiters(err: Error) {
    for (const w of this.readyWaiters.splice(0)) w.reject(err);
    for (const w of this.attentionWaiters.splice(0)) w.reject(err);
    for (const w of this.weightsWaiters.splice(0)) w.reject(err);
  }

  /**
   * 다음 ready 메시지를 기다린다 (엣지 트리거).
   * 워커는 요청을 순서대로 처리하므로, 보내기 전에 등록하면 요청-응답이
   * FIFO로 짝지어진다. 상태 기반이 아니라서 init 직후 status가 이미
   * "ready"여도 loadWeights의 ready를 제대로 기다릴 수 있다.
   */
  private nextReady(): Promise<void> {
    const w = Promise.withResolvers<void>();
    this.readyWaiters.push(w);
    return w.promise;
  }

  /**
   * 워커에 init을 보내고 그 ready를 기다릴 promise를 돌려준다.
   * ready와 짝을 맞추려면 init/loadWeights는 반드시 대기자 등록과 함께 보낸다.
   */
  private sendInit(corpusText: string): Promise<void> {
    this.ensureWorker();
    this.corpusText = corpusText;
    const ready = this.nextReady();
    this.send({ type: "init", corpusText });
    return ready;
  }

  /** 코퍼스 텍스트로 초기화 (새 모델, 랜덤 가중치) */
  init(corpusName: string, corpusText: string) {
    this.set({
      ...initialState,
      status: "initializing",
      corpusName,
      corpusChars: corpusText.length,
    });
    // 실패는 워커의 error 메시지가 state.error로 알린다
    void this.sendInit(corpusText).catch(() => {});
  }

  /** 실록 코퍼스 fetch 후 초기화 */
  async initSillok() {
    if (this.state.status !== "idle" && this.state.corpusName === "실록")
      return;
    this.set({ status: "initializing", corpusName: "실록" });
    try {
      const text = await getSillokCorpus();
      this.init("실록", text);
    } catch (err) {
      // idle로 되돌려 준비 버튼이 다시 나타나게 (코퍼스 캐시도 비워져 재시도 가능)
      this.set({ status: "idle", error: (err as Error).message });
    }
  }

  private pretrainedLoading = false;

  /** 사전학습 체크포인트 로드. 중복 호출은 무시된다. */
  async loadPretrained() {
    if (this.state.pretrained || this.pretrainedLoading) return;
    this.pretrainedLoading = true;
    this.set({ status: "initializing", corpusName: "실록(사전학습)" });
    try {
      const [{ header, buffer }] = await Promise.all([
        fetchCheckpoint("/gpt/sillok-gpt"),
        this.ensureInit(),
      ]);
      await this.applyWeights(header, buffer, true);
      this.set({
        pretrained: true,
        iter: header.iter,
        corpusChars: this.corpusText.length,
      });
    } catch (err) {
      // 호출자들은 void로 부르므로 state.error로 알린다 (다음 호출이 재시도).
      this.set({ error: (err as Error).message });
    } finally {
      this.pretrainedLoading = false;
    }
  }

  /** 코퍼스가 아직 없으면 실록으로 워커를 init하고 ready까지 기다린다 */
  private async ensureInit(): Promise<void> {
    this.ensureWorker();
    if (this.corpusText) return;
    await this.sendInit(await getSillokCorpus());
  }

  /** 체크포인트 가중치를 워커에 적용하고 ready까지 기다린다 */
  private async applyWeights(
    header: CheckpointHeader,
    buffer: ArrayBuffer,
    transfer = false,
  ): Promise<void> {
    this.set({ status: "initializing" });
    const ready = this.nextReady();
    this.send(
      { type: "loadWeights", header, buffer },
      transfer ? [buffer] : undefined,
    );
    await ready;
  }

  start() {
    if (this.state.status !== "ready") return;
    this.set({ status: "training" });
    this.send({ type: "start" });
  }

  pause() {
    this.send({ type: "pause" });
    this.set({ status: "ready" });
  }

  generate(prompt: string, temperature: number, maxTokens = 300) {
    this.set({ generating: true, generated: "" });
    this.send({ type: "generate", prompt, temperature, maxTokens });
  }

  /** attention 가중치 요청. 워커가 error를 보내면 reject된다 */
  attention(prompt: string, layer: number) {
    // 이전 실패의 오류 표시가 새 요청에도 남지 않게 지운다
    this.set({ error: null });
    const w =
      Promise.withResolvers<
        Extract<WorkerToMain, { type: "attentionResult" }>
      >();
    this.attentionWaiters.push(w);
    this.send({ type: "attention", prompt, layer });
    return w.promise;
  }

  async saveToBrowser(key = "my-model") {
    const w = Promise.withResolvers<{
      header: CheckpointHeader;
      buffer: ArrayBuffer;
    }>();
    this.weightsWaiters.push(w);
    this.send({ type: "exportWeights" });
    const { header, buffer } = await w.promise;
    await saveCheckpoint(key, header, buffer);
  }

  async restoreFromBrowser(key = "my-model"): Promise<boolean> {
    const saved = await loadCheckpoint(key);
    if (!saved) return false;
    await this.ensureInit();
    await this.applyWeights(saved.header, saved.buffer);
    this.set({ iter: saved.header.iter });
    return true;
  }
}

/** 학습 절에서 독자가 직접 학습시키는 모델 */
export const trainerStore = new TrainerStore();
/** 사전학습 체크포인트 전용 (다른 절들이 학습과 독립적으로 사용) */
export const pretrainedStore = new TrainerStore();
