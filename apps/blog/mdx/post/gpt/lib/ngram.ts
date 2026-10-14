/**
 * 2·3절 컴포넌트용 n-gram 도구.
 * 글의 이 시점에는 자모 분해가 아직 등장하지 않으므로 "음절(글자) 단위"로 동작한다.
 * 표를 저장하지 않고 실제 코퍼스 문자열 검색으로 분포를 얻는다.
 */

import { sum } from "es-toolkit";

/** bigram 집계: 글자 a 다음에 온 글자들의 빈도 (상위 vocab만 표시용으로 사용) */
export function buildBigramCounts(
  corpus: string,
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (let i = 0; i < corpus.length - 1; i++) {
    const a = corpus[i];
    const b = corpus[i + 1];
    let row = counts.get(a);
    if (!row) {
      row = new Map();
      counts.set(a, row);
    }
    row.set(b, (row.get(b) ?? 0) + 1);
  }
  return counts;
}

export function topNext(
  counts: Map<string, Map<string, number>>,
  char: string,
  n: number,
): { char: string; count: number; p: number }[] {
  const row = counts.get(char);
  if (!row) return [];
  const total = sum([...row.values()]);
  return [...row.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([c, cnt]) => ({ char: c, count: cnt, p: cnt / total }));
}

/** bigram 표에서 샘플링 생성 */
export function bigramGenerate(
  counts: Map<string, Map<string, number>>,
  prompt: string,
  maxTokens: number,
  random: () => number = Math.random,
): string {
  let seq = prompt;
  for (let t = 0; t < maxTokens; t++) {
    const row = counts.get(seq[seq.length - 1]);
    if (!row) break;
    const total = sum([...row.values()]);
    let r = random() * total;
    let next = "";
    for (const [c, cnt] of row) {
      r -= cnt;
      if (r <= 0) {
        next = c;
        break;
      }
    }
    seq += next;
  }
  return seq;
}

export interface NgramStep {
  text: string;
  /** 이번 스텝의 다음 글자 후보 종류 수 (1이면 코퍼스 강제 복사) */
  choices: number;
}

/**
 * 직전 k글자를 문맥으로 다음 글자를 뽑는 생성기.
 * 매 스텝 코퍼스에서 문맥의 모든 등장을 찾아 다음 글자를 샘플링.
 * 미등장 문맥은 앞을 잘라가며 백오프.
 */
export function* ngramGenerate(
  corpus: string,
  k: number,
  prompt: string,
  maxTokens: number,
  random: () => number = Math.random,
): Generator<NgramStep> {
  let seq = prompt;
  for (let t = 0; t < maxTokens; t++) {
    let ctx = seq.slice(-k);
    let nexts = collectNexts(corpus, ctx);
    while (nexts.length === 0 && ctx.length > 1) {
      ctx = ctx.slice(1);
      nexts = collectNexts(corpus, ctx);
    }
    if (nexts.length === 0) return;
    seq += nexts[Math.floor(random() * nexts.length)];
    yield { text: seq, choices: new Set(nexts).size };
  }
}

function collectNexts(corpus: string, ctx: string): string[] {
  const out: string[] = [];
  let from = 0;
  while (out.length < 2000) {
    const i = corpus.indexOf(ctx, from);
    if (i === -1 || i + ctx.length >= corpus.length) break;
    out.push(corpus[i + ctx.length]);
    from = i + 1;
  }
  return out;
}
