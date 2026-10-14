/// <reference lib="webworker" />
/**
 * 학습 워커. tfjs를 워커 안에서만 로드해 메인 스레드를 막지 않는다.
 * 프로토콜은 protocol.ts 참조.
 */
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { delay, isEqual, randomInt, sumBy } from "es-toolkit";
import { decodeF16, encodeF16 } from "./checkpoint";
import type { GPTConfig, TrainConfig } from "./config";
import { DEFAULT_MODEL, DEFAULT_TRAIN } from "./config";
import type { GPTParams } from "./model";
import {
  attentionWeights,
  createParams,
  disposeParams,
  flattenParams,
  forward,
  makeCausalMask,
} from "./model";
import type { CheckpointHeader, MainToWorker, WorkerToMain } from "./protocol";
import type { Tokenizer } from "./tokenizer";
import { buildTokenizer, fromVocab } from "./tokenizer";

const post = (msg: WorkerToMain, transfer?: Transferable[]) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(
    msg,
    transfer ?? [],
  );

let config: GPTConfig;
let trainCfg: TrainConfig;
let tokenizer: Tokenizer;
let params: GPTParams;
let mask: tf.Tensor;
let optimizer: tf.Optimizer;
let trainData: Int32Array;
let valData: Int32Array;
let iter = 0;
let running = false;
let generating = false;

self.onmessage = async (e: MessageEvent<MainToWorker>) => {
  try {
    const msg = e.data;
    switch (msg.type) {
      case "init":
        await init(msg);
        break;
      case "start":
        if (!running) {
          running = true;
          void trainLoop();
        }
        break;
      case "pause":
        running = false;
        break;
      case "generate":
        await generate(msg.prompt, msg.temperature, msg.maxTokens, true);
        break;
      case "loadWeights":
        loadWeights(msg.header, msg.buffer);
        break;
      case "exportWeights":
        exportWeights();
        break;
      case "attention":
        await attention(msg.prompt, msg.layer);
        break;
    }
  } catch (err) {
    post({ type: "error", message: (err as Error).message });
  }
};

/** 기존 모델 리소스(파라미터·마스크·옵티마이저 슬롯)를 해제하고 config대로 재생성 */
function rebuildModel(learningRate: number) {
  if (params) disposeParams(params);
  mask?.dispose();
  optimizer?.dispose();
  params = createParams(tf, config);
  mask = makeCausalMask(tf, config.blockSize);
  optimizer = tf.train.adam(learningRate);
}

async function init(msg: Extract<MainToWorker, { type: "init" }>) {
  try {
    await tf.setBackend("webgpu");
    await tf.ready();
  } catch {
    await tf.setBackend("webgl");
    await tf.ready();
  }

  tokenizer = buildTokenizer(msg.corpusText);
  config = {
    ...DEFAULT_MODEL,
    ...msg.model,
    vocabSize: tokenizer.vocabSize,
  };
  trainCfg = { ...DEFAULT_TRAIN, ...msg.train };

  const ids = tokenizer.encode(msg.corpusText);
  const all = Int32Array.from(ids);
  const split = Math.floor(all.length * (1 - trainCfg.valFraction));
  trainData = all.subarray(0, split);
  valData = all.subarray(split);

  rebuildModel(trainCfg.learningRate);
  iter = 0;

  const paramCount = sumBy(flattenParams(params), ([, v]) => v.size);
  post({
    type: "ready",
    backend: tf.getBackend(),
    vocabSize: config.vocabSize,
    paramCount,
  });
}

function getBatch(data: Int32Array): { x: tf.Tensor; y: tf.Tensor } {
  const { batchSize } = trainCfg;
  const T = config.blockSize;
  const xs = new Int32Array(batchSize * T);
  const ys = new Int32Array(batchSize * T);
  for (let b = 0; b < batchSize; b++) {
    const start = randomInt(data.length - T - 1);
    xs.set(data.subarray(start, start + T), b * T);
    ys.set(data.subarray(start + 1, start + T + 1), b * T);
  }
  return {
    x: tf.tensor2d(xs, [batchSize, T], "int32"),
    y: tf.tensor2d(ys, [batchSize, T], "int32"),
  };
}

function lossOn(x: tf.Tensor, y: tf.Tensor): tf.Scalar {
  const logits = forward(tf, params, config, x, mask);
  const oneHot = tf.oneHot(y.reshape([-1]), config.vocabSize);
  return tf.losses.softmaxCrossEntropy(oneHot, logits);
}

async function trainLoop() {
  const t0 = performance.now();
  const iter0 = iter;
  while (running) {
    // 생성 요청이 끼어들 수 있게 매 iter 양보
    if (generating) {
      await delay(50);
      continue;
    }
    const { x, y } = getBatch(trainData);
    const lossT = optimizer.minimize(
      () => tf.tidy(() => lossOn(x, y)),
      true,
    ) as tf.Scalar;
    const loss = (await lossT.data())[0];
    lossT.dispose();
    x.dispose();
    y.dispose();
    iter++;

    let valLoss: number | undefined;
    if (trainCfg.evalInterval && iter % trainCfg.evalInterval === 0) {
      valLoss = await evalValLoss();
    }
    const itPerSec = (iter - iter0) / ((performance.now() - t0) / 1000);
    post({
      type: "progress",
      iter,
      loss,
      valLoss,
      itPerSec,
      tokensSeen: iter * trainCfg.batchSize * config.blockSize,
    });

    if (trainCfg.sampleInterval && iter % trainCfg.sampleInterval === 0) {
      // 항상 같은 프롬프트로 생성해야 회차 간 변화가 비교된다
      const text = await generate("임금이 말하기를", 0.8, 150, false);
      post({ type: "sampleText", text, iter });
    }
    await delay(trainCfg.interIterDelayMs);
  }
}

async function evalValLoss(): Promise<number> {
  const { x, y } = getBatch(valData);
  const lossT = tf.tidy(() => lossOn(x, y));
  const v = (await lossT.data())[0];
  lossT.dispose();
  x.dispose();
  y.dispose();
  return v;
}

async function generate(
  prompt: string,
  temperature: number,
  maxTokens: number,
  stream: boolean,
): Promise<string> {
  generating = true;
  try {
    let ids = tokenizer.encode(prompt);
    if (ids.length === 0) ids = [0];
    for (let t = 0; t < maxTokens; t++) {
      const ctx = ids.slice(-config.blockSize);
      // tf.multinomial이 WebGPU에서 오동작해서(항상 0 반환) 샘플링은 JS로 한다.
      const probsT = tf.tidy(() => {
        const x = tf.tensor2d([ctx], [1, ctx.length], "int32");
        const logits = forward(tf, params, config, x, mask);
        const last = logits
          .slice([ctx.length - 1, 0], [1, config.vocabSize])
          .div(Math.max(temperature, 1e-4));
        return tf.softmax(last);
      });
      const probs = (await probsT.data()) as Float32Array;
      probsT.dispose();
      let r = Math.random();
      let next = probs.length - 1;
      for (let i = 0; i < probs.length; i++) {
        r -= probs[i];
        if (r <= 0) {
          next = i;
          break;
        }
      }
      ids.push(next);
      if (stream) post({ type: "token", char: tokenizer.vocab[next] });
      // 학습 루프에 잠깐 양보
      if (t % 32 === 31) await delay(0);
    }
    const text = tokenizer.decode(ids);
    if (stream) post({ type: "generateDone", text });
    return text;
  } finally {
    generating = false;
  }
}

async function attention(prompt: string, layer: number) {
  const ids = tokenizer.encode(prompt).slice(-config.blockSize);
  if (ids.length < 2) {
    post({ type: "error", message: "프롬프트가 너무 짧습니다" });
    return;
  }
  const att = tf.tidy(() =>
    attentionWeights(
      tf,
      params,
      config,
      tf.tensor2d([ids], [1, ids.length], "int32"),
      layer,
      mask,
    ),
  );
  const data = await att.data();
  const [H, T] = [att.shape[0], att.shape[1]] as [number, number];
  att.dispose();
  const weights: number[][][] = [];
  for (let h = 0; h < H; h++) {
    const rows: number[][] = [];
    for (let i = 0; i < T; i++)
      rows.push(
        Array.from(data.subarray(h * T * T + i * T, h * T * T + i * T + T)),
      );
    weights.push(rows);
  }
  post({
    type: "attentionResult",
    weights,
    tokens: ids.map((i) => tokenizer.vocab[i]),
    layer,
  });
}

function exportWeights() {
  const entries = flattenParams(params);
  const total = sumBy(entries, ([, v]) => v.size);
  const f32 = new Float32Array(total);
  let offset = 0;
  for (const [, v] of entries) {
    f32.set(v.dataSync() as Float32Array, offset);
    offset += v.size;
  }
  const bits = encodeF16(f32);
  const header: CheckpointHeader = {
    version: 1,
    config,
    vocab: tokenizer.vocab,
    tensors: entries.map(([name, v]) => [name, v.shape]),
    iter,
  };
  const buffer = bits.buffer as ArrayBuffer;
  post({ type: "weights", header, buffer }, [buffer]);
}

function loadWeights(header: CheckpointHeader, buffer: ArrayBuffer) {
  // 체크포인트의 vocab/config로 모델을 재구성
  tokenizer = fromVocab(header.vocab);
  const needRebuild = !params || !isEqual(config, header.config);
  config = header.config;
  if (needRebuild) rebuildModel(trainCfg?.learningRate ?? 1e-3);
  const f32 = decodeF16(new Uint16Array(buffer));
  let offset = 0;
  const entries = flattenParams(params);
  for (let i = 0; i < entries.length; i++) {
    const [, v] = entries[i];
    const shape = header.tensors[i][1];
    const size = shape.reduce((a, b) => a * b, 1);
    v.assign(tf.tensor(f32.subarray(offset, offset + size), shape));
    offset += size;
  }
  iter = header.iter;
  const paramCount = sumBy(entries, ([, v]) => v.size);
  post({
    type: "ready",
    backend: tf.getBackend(),
    vocabSize: config.vocabSize,
    paramCount,
  });
  // 로드 검증: val loss가 체크포인트 수준(≈1.0)인지 확인
  if (valData?.length) {
    void evalValLoss().then((v) =>
      console.log(`[trainWorker] loaded checkpoint val loss = ${v.toFixed(4)}`),
    );
  }
}
