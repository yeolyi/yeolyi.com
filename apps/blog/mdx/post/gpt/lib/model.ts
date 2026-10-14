/**
 * GPT를 tfjs low-level ops로 구현.
 * 레이어 API를 쓰지 않고 행렬 연산을 직접 조립한다 (글 본문의 코드와 대응).
 */
import type * as tfType from "@tensorflow/tfjs";
import type { GPTConfig } from "./config";

type TF = typeof tfType;

interface BlockParams {
  ln1g: tfType.Variable;
  ln1b: tfType.Variable;
  qkv: tfType.Variable; // [D, 3D]
  qkvB: tfType.Variable; // [3D]
  proj: tfType.Variable; // [D, D]
  projB: tfType.Variable; // [D]
  ln2g: tfType.Variable;
  ln2b: tfType.Variable;
  fc: tfType.Variable; // [D, 4D]
  fcB: tfType.Variable; // [4D]
  fproj: tfType.Variable; // [4D, D]
  fprojB: tfType.Variable; // [D]
}

export interface GPTParams {
  wte: tfType.Variable; // [V, D]
  wpe: tfType.Variable; // [T, D]
  lnfG: tfType.Variable;
  lnfB: tfType.Variable;
  head: tfType.Variable; // [D, V]
  blocks: BlockParams[];
}

/** 파라미터 순회 순서 고정 (체크포인트 직렬화가 이 순서에 의존) */
export function flattenParams(p: GPTParams): [string, tfType.Variable][] {
  const out: [string, tfType.Variable][] = [
    ["wte", p.wte],
    ["wpe", p.wpe],
  ];
  p.blocks.forEach((b, i) => {
    for (const [k, v] of Object.entries(b)) {
      out.push([`block${i}.${k}`, v as tfType.Variable]);
    }
  });
  out.push(["lnfG", p.lnfG], ["lnfB", p.lnfB], ["head", p.head]);
  return out;
}

export function createParams(tf: TF, c: GPTConfig): GPTParams {
  const D = c.nEmbd;
  const rand = (shape: number[], std = 0.02) =>
    tf.variable(tf.randomNormal(shape, 0, std));
  const zeros = (shape: number[]) => tf.variable(tf.zeros(shape));
  const ones = (shape: number[]) => tf.variable(tf.ones(shape));
  return {
    wte: rand([c.vocabSize, D]),
    wpe: rand([c.blockSize, D]),
    lnfG: ones([D]),
    lnfB: zeros([D]),
    head: rand([D, c.vocabSize]),
    blocks: Array.from({ length: c.nLayer }, () => ({
      ln1g: ones([D]),
      ln1b: zeros([D]),
      qkv: rand([D, 3 * D]),
      qkvB: zeros([3 * D]),
      proj: rand([D, D], 0.02 / Math.sqrt(2 * c.nLayer)),
      projB: zeros([D]),
      ln2g: ones([D]),
      ln2b: zeros([D]),
      fc: rand([D, 4 * D]),
      fcB: zeros([4 * D]),
      fproj: rand([4 * D, D], 0.02 / Math.sqrt(2 * c.nLayer)),
      fprojB: zeros([D]),
    })),
  };
}

export function disposeParams(p: GPTParams) {
  for (const [, v] of flattenParams(p)) v.dispose();
}

function layerNorm(
  tf: TF,
  x: tfType.Tensor,
  g: tfType.Variable,
  b: tfType.Variable,
) {
  const { mean, variance } = tf.moments(x, -1, true);
  return tf.add(
    tf.mul(tf.div(tf.sub(x, mean), tf.sqrt(tf.add(variance, 1e-5))), g),
    b,
  );
}

function gelu(tf: TF, x: tfType.Tensor) {
  const c = Math.sqrt(2 / Math.PI);
  return tf.mul(
    tf.mul(x, 0.5),
    tf.add(1, tf.tanh(tf.mul(c, tf.add(x, tf.mul(0.044715, tf.pow(x, 3)))))),
  );
}

/** softmax 전에 미래 위치를 -1e9로 밀어내는 additive mask [1,1,T,T] */
export function makeCausalMask(tf: TF, T: number): tfType.Tensor {
  const buf = tf.buffer([1, 1, T, T]);
  for (let i = 0; i < T; i++)
    for (let j = i + 1; j < T; j++) buf.set(-1e9, 0, 0, i, j);
  return buf.toTensor();
}

/**
 * 트랜스포머 블록 1개: attention + MLP (둘 다 residual).
 * x: [B,T,D] → 같은 shape. attention 가중치 [B,H,T,T]도 함께 반환한다
 * (forward는 버리고, attentionWeights는 이걸 뽑아 쓴다).
 */
function block(
  tf: TF,
  c: GPTConfig,
  bl: BlockParams,
  x: tfType.Tensor,
  mask: tfType.Tensor,
): { x: tfType.Tensor; att: tfType.Tensor } {
  const [B, T] = x.shape as [number, number, number];
  const D = c.nEmbd;
  const H = c.nHead;
  const HS = D / H;

  const h = layerNorm(tf, x, bl.ln1g, bl.ln1b);
  const qkv = tf.add(tf.matMul(h.reshape([B * T, D]), bl.qkv), bl.qkvB);
  const [q, k, v] = tf.split(qkv.reshape([B, T, 3, H, HS]), 3, 2);
  const qh = q.reshape([B, T, H, HS]).transpose([0, 2, 1, 3]);
  const kh = k.reshape([B, T, H, HS]).transpose([0, 2, 1, 3]);
  const vh = v.reshape([B, T, H, HS]).transpose([0, 2, 1, 3]);
  let att = tf.mul(tf.matMul(qh, kh, false, true), 1 / Math.sqrt(HS));
  att = tf.softmax(tf.add(att, mask));
  const y = tf
    .matMul(att, vh)
    .transpose([0, 2, 1, 3])
    .reshape([B * T, D]);
  let out = tf.add(
    x,
    tf.add(tf.matMul(y, bl.proj), bl.projB).reshape([B, T, D]),
  );

  const h2 = layerNorm(tf, out, bl.ln2g, bl.ln2b);
  const f = tf.add(
    tf.matMul(
      gelu(tf, tf.add(tf.matMul(h2.reshape([B * T, D]), bl.fc), bl.fcB)),
      bl.fproj,
    ),
    bl.fprojB,
  );
  out = tf.add(out, f.reshape([B, T, D]));
  return { x: out, att };
}

/** 토큰 임베딩 + 위치 임베딩. idx: int32 [B, T] → [B,T,D] */
function embed(tf: TF, p: GPTParams, idx: tfType.Tensor): tfType.Tensor {
  const T = idx.shape[1] as number;
  return tf.add(
    tf.gather(p.wte, idx),
    tf.gather(p.wpe, tf.range(0, T, 1, "int32")),
  );
}

/**
 * forward. idx: int32 [B, T] → logits [B*T, V]
 * mask는 blockSize 기준으로 만들어 슬라이스해 재사용.
 */
export function forward(
  tf: TF,
  p: GPTParams,
  c: GPTConfig,
  idx: tfType.Tensor,
  fullMask: tfType.Tensor,
): tfType.Tensor {
  const [B, T] = idx.shape as [number, number];
  const D = c.nEmbd;
  const mask = fullMask.slice([0, 0, 0, 0], [1, 1, T, T]);

  let x = embed(tf, p, idx); // [B,T,D]
  for (const bl of p.blocks) {
    x = block(tf, c, bl, x, mask).x;
  }

  const xf = layerNorm(tf, x, p.lnfG, p.lnfB);
  return tf.matMul(xf.reshape([B * T, D]), p.head); // [B*T, V]
}

/**
 * attention 가중치 추출 (히트맵 컴포넌트용).
 * 지정 레이어의 softmax(QKᵀ/√d + mask)를 반환. [H, T, T]
 */
export function attentionWeights(
  tf: TF,
  p: GPTParams,
  c: GPTConfig,
  idx: tfType.Tensor, // int32 [1, T]
  layer: number,
  fullMask: tfType.Tensor,
): tfType.Tensor {
  const T = idx.shape[1] as number;
  const H = c.nHead;
  const mask = fullMask.slice([0, 0, 0, 0], [1, 1, T, T]);

  let x = embed(tf, p, idx);
  for (let li = 0; li < p.blocks.length; li++) {
    const r = block(tf, c, p.blocks[li], x, mask);
    if (li === layer) return r.att.reshape([H, T, T]);
    x = r.x;
  }
  throw new Error(`layer ${layer} out of range`);
}
